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

process.on("SIGTERM", async () => {
  console.log("Shutting down consumer");
  await consumer.disconnect();
  mongoose.disconnect();
  process.exit(0);
});
