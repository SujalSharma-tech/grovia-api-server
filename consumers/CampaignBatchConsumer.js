import envconfig from "../config/envConfig.js";
import { Kafka } from "kafkajs";
import fs from "fs";
import mongoose from "mongoose";
import dbConnect from "../db/dbConnect.js";
import kafkaService from "./KafkaService.js";
import CustomerSegment from "../models/CustomerSegmentSchema.js";
import Campaign from "../models/CampaignSchema.js";
import User from "../models/UserSchema.js";
import MessageLog from "../models/MessageLogSchema.js";
import Customer from "../models/CustomerSchema.js";
import InsightModel from "../models/InsightsSchema.js";
import { GoogleGenAI } from "@google/genai";

dbConnect();

const kafka = new Kafka({
  brokers: envconfig.kafka.brokers,
  clientId: "campaign-processor",
  sasl: {
    username: envconfig.kafka.saslUser,
    password: envconfig.kafka.saslPass,
    mechanism: "plain",
  },
  ssl: { ca: [fs.readFileSync("kafkakey.pem", "utf-8")] },
});

const consumer = kafka.consumer({ groupId: "campaign-batch-group" });

try {
  await consumer.connect();

  await consumer.subscribe({
    topic: "campaign-batch-data-topic",
    fromBeginning: true,
  });

  await consumer.subscribe({
    topic: "message-log-topic",
    fromBeginning: true,
  });

  await consumer.subscribe({
    topic: "insights-topic",
    fromBeginning: true,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      switch (topic) {
        case "campaign-batch-data-topic":
          try {
            const batchData = JSON.parse(message.value.toString());

            const {
              campaignId,
              segment_id,
              content,
              name,
              organizationId,
              userId,
            } = batchData;
            await prepareBatches(
              campaignId,
              segment_id,
              content,
              name,
              organizationId,
              userId
            );
          } catch (err) {
            console.error("Error processing campaign batch:", err);
          }
          break;
        case "message-log-topic":
          try {
            const campaignIdObj = JSON.parse(message.value.toString());
            const campaignId = campaignIdObj.campaignId;

            await MessageLog.deleteMany({
              campaign_id: new mongoose.Types.ObjectId(campaignId),
            });
          } catch (err) {
            console.error("Error deleting message log:", err);
          }
          break;
        case "insights-topic":
          const dataObj = JSON.parse(message.value.toString());
          const { organizationId, insightId } = dataObj;
          await generateCampaignInsights(organizationId, insightId);
      }
    },
  });
} catch (err) {}
async function prepareBatches(
  campaignId,
  segmentId,
  content,
  name,
  organizationId,
  userId
) {
  const customerSeg = await CustomerSegment.find({ segment_id: segmentId });
  const customerIds = customerSeg.map((cus) => cus.customer_id);
  const customers = await Customer.find({ _id: { $in: customerIds } });
  await Campaign.findByIdAndUpdate(campaignId, {
    audience_size: customers.length,
  });

  const BATCH_SIZE = 100;
  let batch_indx = 0;
  const totalBatches = Math.ceil(customers.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch_customers = customers.slice(i, i + BATCH_SIZE);
    batch_indx++;

    const current_customers = batch_customers.map((customer) => ({
      id: customer._id,
      name: customer.name,
      email: customer.email,
    }));

    await processBatch(
      campaignId,
      segmentId,
      batch_indx,
      totalBatches,
      current_customers,
      content,
      name,
      organizationId,
      userId
    );
  }
}

async function processBatch(
  campaignId,
  segmentId,
  batch_indx,
  totalBatches,
  current_customers,
  content,
  name,
  organizationId,
  userId
) {
  try {
    const messageLogs = current_customers.map((customer) => ({
      campaign_id: campaignId,
      user_id: customer.id,
      user_name: customer.name,
      user_email: customer.email,
      message: content.replace(
        /\{([^}]+)\}/g,
        (match, key) => customer[key.toLowerCase().trim()] || match
      ),
      status: "PENDING",
    }));

    const insertedLogs = await MessageLog.insertMany(messageLogs);
    console.log(
      `Inserted ${insertedLogs.length} message logs for campaign ${campaignId} batch ${batch_indx}`
    );

    const batchResults = {
      campaignId,
      batch_indx,
      totalBatches,
      messageResults: [],
    };

    for (const msg of insertedLogs) {
      const isSuccess = Math.random() <= 0.85;
      const status = isSuccess ? "SENT" : "FAILED";
      batchResults.messageResults.push({
        messageId: msg._id.toString(),
        status,
      });
    }

    await processDelieveryStatus(batchResults, name, organizationId, userId);
  } catch (err) {
    console.error(err);
  }
}

async function processDelieveryStatus(
  batchResults,
  name,
  organizationId,
  userId
) {
  const { campaignId, batch_indx, totalBatches, messageResults } = batchResults;
  try {
    const bulkAdd = messageResults.map((result) => ({
      updateOne: {
        filter: { _id: result.messageId },
        update: {
          $set: {
            status: result.status,
          },
        },
      },
    }));

    await MessageLog.bulkWrite(bulkAdd);

    const sent = messageResults.filter((r) => r.status === "SENT").length;
    const failed = messageResults.filter((r) => r.status === "FAILED").length;

    const updatedCampaign = await Campaign.findOneAndUpdate(
      { _id: campaignId },
      { $inc: { sent, failed } },
      { new: true }
    );

    const total = updatedCampaign.sent + updatedCampaign.failed;
    const isComplete = total >= updatedCampaign.audience_size;
    if (total > 0) {
      const updates = {
        successRate: (updatedCampaign.sent / total) * 100,
      };

      if (isComplete) {
        updates.status = "COMPLETED";
        const user = await User.findById(userId);
        const action = {
          title: "Campaign Sent",
          description: `Sent campaign ${name} to ${updatedCampaign.sent} recipients`,
          type: "campaign_sent",
          createdBy: { email: user.email, fullname: user.fullname },
          userId: userId,
          organizationId: organizationId,
          targetActionId: updatedCampaign._id,
          targetModel: "Campaign",
        };
        await kafkaService.publishActivity(action);
      }

      await Campaign.findByIdAndUpdate(campaignId, { $set: updates });
    }

    console.log(
      `Processed results for campaign ${campaignId} batch ${batch_indx}/${totalBatches}`
    );
    console.log(`Batch stats: ${sent} sent, ${failed} failed`);

    if (isComplete) {
      console.log(
        `Campaign ${campaignId} completed! Final stats: ${updatedCampaign.sent} sent, ${updatedCampaign.failed} failed`
      );
    }
  } catch (err) {
    console.error(err);
  }
}

export async function generateCampaignInsights(organizationId, insightId) {
  try {
    const campaigns = await Campaign.find({
      organizationId,
      status: { $in: ["COMPLETED"] },
    }).sort({ createdAt: -1 });

    if (campaigns.length === 0) {
      await InsightModel.findByIdAndUpdate({
        _id: new mongoose.Types.ObjectId(insightId),
      });
    }

    const campaignInsights = [];
    for (const campaign of campaigns) {
      const messageLogs = await MessageLog.find({
        campaign_id: campaign._id,
      });
      if (messageLogs.length === 0) continue;
      const customerIds = messageLogs.map((log) => log._id);
      const customers = await Customer.find({ _id: { $in: customerIds } });

      const campaignData = {
        campaignId: campaign._id.toString(),
        name: campaign.name,
        createdAt: campaign.createdAt,
        basics: {
          totalRecipients: campaign.audience_size || 0,
          delivered: campaign.sent || 0,
          failed: campaign.failed || 0,
          deliveryRate: campaign.successRate,
        },
        segments: [],
      };
      const highSpenders = customers.filter((c) => c.totalspend > 100);
      if (highSpenders.length > 0) {
        const highSpenderIds = highSpenders.map((c) => c._id.toString());
        const highSpenderLogs = messageLogs.filter((log) =>
          highSpenderIds.includes(log.user_id.toString())
        );
        const delivered = highSpenderLogs.filter(
          (log) => log.status === "SENT"
        ).length;

        campaignData.segments.push({
          name: "High Spenders (>$100)",
          recipients: highSpenderLogs.length,
          delivered,
          deliveryRate:
            delivered > 0
              ? ((delivered / highSpenderLogs.length) * 100).toFixed(1) + "%"
              : "0%",
        });
      }

      const recentCustomers = customers.filter((c) => c.lastpurchase_day < 20);
      if (recentCustomers.length > 0) {
        const recentCustomerIds = recentCustomers.map((c) => c._id.toString());
        const recentCustomerLogs = messageLogs.filter((log) =>
          recentCustomerIds.includes(log.user_id.toString())
        );
        const delivered = recentCustomerLogs.filter(
          (log) => log.status === "SENT"
        ).length;

        campaignData.segments.push({
          name: "Recent Customers (last 20 days)",
          recipients: recentCustomerLogs.length,
          delivered,
          deliveryRate:
            delivered > 0
              ? ((delivered / recentCustomerLogs.length) * 100).toFixed(1) + "%"
              : "0%",
        });
      }
      campaignInsights.push(campaignData);
    }

    const orgData = {
      totalCampaigns: campaignInsights.length,
      totalRecipients: campaignInsights.reduce(
        (sum, cus) => sum + cus.basics.totalRecipients,
        0
      ),
      totalDelivered: campaignInsights.reduce(
        (sum, cus) => sum + cus.basics.delivered,
        0
      ),
      averageDeliveryRate:
        campaignInsights.length > 0
          ? (
              campaignInsights.reduce(
                (sum, c) =>
                  sum + (c.basics.delivered / c.basics.totalRecipients) * 100,
                0
              ) / campaignInsights.length
            ).toFixed(1) + "%"
          : "0%",
      bestPerformingCampaign:
        campaignInsights.length > 0
          ? campaignInsights.reduce((best, current) => {
              const bestRate =
                best.basics.delivered / best.basics.totalRecipients;
              const currentRate =
                current.basics.delivered / current.basics.totalRecipients;
              return currentRate > bestRate ? current : best;
            })
          : null,
      campaigns: campaignInsights,
    };
    const ai = new GoogleGenAI({ apiKey: envconfig.geminiApi });
    const systemInstruction = {
      text: `You are a marketing analytics expert who provides concise, insightful summaries of campaign performance.
      Create an overview of all campaigns with a focus on delivery rates, audience engagement across segments, and trends.
      Start with a high-level overview of all campaigns, then briefly mention notable insights for individual campaigns.
      Include specific numbers and percentages. Use a professional but conversational tone.
      Example: "Your 5 campaigns reached 6,450 users with an average delivery rate of 88.5%. The 'Summer Sale' campaign had the best performance with a 93.2% delivery rate. High-spending customers consistently show 15% better engagement than other segments."
      STRICTLY DO NOT USE FORMATING GIVE PLAIN PARAGRAPHS GIVE MORE INSIGHTS`,
    };
    const userPrompt = `Generate insights for this organization's campaign data:
    ${JSON.stringify(orgData, null, 2)}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      },
      config: {
        systemInstruction,
      },
    });

    const insightsdata = response.text;
    await InsightModel.findByIdAndUpdate(insightId, {
      $set: {
        status: "COMPLETED",
        content: insightsdata,
      },
    });
  } catch (err) {
    console.log(err);
  }
}
process.on("SIGTERM", async () => {
  console.log("Shutting down consumer");
  await consumer.disconnect();
  mongoose.disconnect();
  process.exit(0);
});
