import Campaign from "../models/CampaignSchema.js";
import Customer from "../models/CustomerSchema.js";
import CustomerSegment from "../models/CustomerSegmentSchema.js";
import MessageLog from "../models/MessageLogSchema.js";

export async function createCampaign(req, res) {
  const { name, content, segment_id } = req.body;

  try {
    if (!name || !content || !segment_id) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill in all fields" });
    }

    const campaign = await Campaign.insertOne({
      name,
      content,
      segment_id,
      status: "PENDING",
      audience_size: 0,
      sent: 0,
      failed: 0,
      successRate: 0,
    });

    await prepareBatches(campaign._id, segment_id, content);

    res
      .status(200)
      .json({ success: true, message: "Campaign Created Successfully" });
  } catch (err) {
    return res.status(400).json({ message: "Invalid request" });
  }
}

async function prepareBatches(campaignId, segmentId, content) {
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
      content
    );
  }
}

async function processBatch(
  campaignId,
  segmentId,
  batch_indx,
  totalBatches,
  current_customers,
  content
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

    await processDelieveryStatus(batchResults);
  } catch (err) {
    console.error(err);
  }
}

async function processDelieveryStatus(batchResults) {
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
