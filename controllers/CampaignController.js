import Campaign from "../models/CampaignSchema.js";
import kafkaService from "../services/KafkaService.js";

export async function createCampaign(req, res) {
  const { name, content, segment_id, organizationId } = req.body;
  const userId = req.user.id;

  try {
    if (!name || !content || !segment_id) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill in all fields" });
    }

    let campaign = await Campaign.insertOne({
      name,
      content,
      segment_id,
      status: "PENDING",
      audience_size: 0,
      sent: 0,
      failed: 0,
      successRate: 0,
      organizationId,
    });
    const batchData = {
      campaignId: campaign._id,
      segment_id,
      content,
      name,
      organizationId,
      userId,
    };
    const action = {
      title: "Campaign Created",
      description: `Campaign ${name} created by ${req.user.name}`,
      userId,
      organizationId,
      type: "campaign_created",
      targetActionId: campaign._id,
      targetModel: "Campaign",
    };
    await kafkaService.publishActivity(action);
    const published = await kafkaService.publishBatchData(batchData);
    if (!published) {
      console.log("Error in publishing batch data");
      campaign = await Campaign.findByIdAndUpdate(
        campaign._id,
        { $set: "FAILED" },
        { new: true }
      );
    }
    res.status(200).json({
      success: true,
      message: "Campaign Created Successfully",
      data: { campaign },
    });
  } catch (err) {
    return res.status(400).json({ message: "Invalid request" });
  }
}

export async function getAllOrganizationCampaigns(req, res) {
  try {
    const { organizationId } = req.body;
    const userId = req.user.id;

    const userRole = req.userRole;
    const canEdit = userRole === "admin" || userRole === "editor";
    const canDelete = userRole === "admin";

    let campaigns = await Campaign.find({ organizationId }).sort({
      createdAt: -1,
    });

    campaigns = campaigns.map((campaign) => ({
      ...campaign.toObject(),
      userRole,
      canEdit,
      canDelete,
    }));

    return res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (err) {
    console.error("Failed to fetch organization campaigns:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
    });
  }
}

export async function deleteCampaign(req, res) {
  const { campaignId, organizationId } = req.body;
  const userId = req.user.id;

  try {
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    await Campaign.findByIdAndDelete(campaignId);

    const action = {
      title: "Campaign Deleted",
      description: `Campaign "${campaign.name}" was deleted`,
      type: "campaign_deleted",
      organizationId: organizationId,
      userId,
      createdBy: {
        email: req.user.email,
        fullname: req.user.name,
      },
      targetActionId: campaignId,
      targetModel: "Campaign",
    };

    const removeMessages = await kafkaService.publishDelete(campaignId);
    const published = await kafkaService.publishActivity(action);
    if (!removeMessages) {
      console.log("Error publishing remove messages");
    }

    if (!published) {
      console.log("Error publishing Campaign Activity");
    }

    return res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (err) {
    console.error("Failed to delete campaign:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
    });
  }
}
