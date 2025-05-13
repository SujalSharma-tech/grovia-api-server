import Organization from "../models/OrganizationSchema.js";
import OrganizationMember from "../models/OrganizationMemberSchema.js";
import User from "../models/UserSchema.js";
import RecentAction from "../models/RecentActionsSchema.js";
import Segment from "../models/SegmentSchema.js";
import Customer from "../models/CustomerSchema.js";
import Campaign from "../models/CampaignSchema.js";
import mongoose from "mongoose";
import Invite from "../models/InvitesModel.js";
import CustomerSegment from "../models/CustomerSegmentSchema.js";
import kafkaService from "../services/KafkaService.js";

export async function getOrganizationMembers(req, res) {
  const { organizationId } = req.body;
  const userId = req.user.id;

  try {
    const members = await OrganizationMember.find({ organizationId })
      .populate("userId", "fullname email")
      .lean();

    const pendingInvites = await Invite.find({
      organizationId,
      status: "pending",
    })
      .populate("inviteeId", "fullname email")
      .populate("inviterId", "fullname email")
      .lean();

    const formattedMembers = members.map((member) => ({
      id: member.userId._id,
      name: member.userId.fullname,
      email: member.userId.email,
      role: member.role,
      status: "active",
      addedAt: member.addedAt,
      isCurrentUser: member.userId._id.toString() === userId,
    }));

    const formattedInvites = pendingInvites.map((invite) => ({
      id: invite.inviteeId._id,
      name: invite.inviteeId.fullname,
      email: invite.inviteeId.email,
      role: invite.role,
      status: "pending",
      invitedBy: {
        name: invite.inviterId.fullname,
        email: invite.inviterId.email,
      },
      invitedAt: invite.createdAt,
      inviteId: invite._id,
    }));

    const organization = await Organization.findById(organizationId).select(
      "name owner"
    );

    const isOwner =
      organization.owner && organization.owner.toString() === userId;

    return res.status(200).json({
      success: true,
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
        },
        members: formattedMembers,
        pendingInvites: formattedInvites,
        currentUserRole: req.userRole,
        isOwner,
      },
    });
  } catch (err) {
    console.error("Failed to fetch organization members:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization members",
    });
  }
}

export async function getUserOrganizations(req, res) {
  const userId = req.user.id;

  try {
    const memberships = await OrganizationMember.find({ userId }).lean();

    if (memberships.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "You don't belong to any organizations yet",
      });
    }

    const organizationIds = memberships.map((m) => m.organizationId);

    const organizations = await Organization.find({
      _id: { $in: organizationIds },
    }).lean();

    const organizationsWithRoles = organizations.map((org) => {
      const membership = memberships.find(
        (m) => m.organizationId.toString() === org._id.toString()
      );

      return {
        ...org,
        role: membership.role,
        isOwner: org.owner.toString() === userId,
      };
    });

    return res.status(200).json({
      success: true,
      organizations: organizationsWithRoles,
    });
  } catch (err) {
    console.error("Failed to fetch user organizations:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch organizations",
    });
  }
}

export async function createOrganization(req, res) {
  const { name, description } = req.body;
  const userId = req.user.id;

  try {
    const organization = await Organization.create({
      name,
      description,
      owner: userId,
    });

    await OrganizationMember.create({
      organizationId: organization._id,
      userId,
      role: "admin",
    });

    const action = {
      title: "Organization Created",
      description: `Organization "${name}" was created`,
      type: "organization_created",
      userId,
      targetActionId: organization._id,
      organizationId: organization._id,
      createdBy: {
        fullname: req.user.name,
        email: req.user.email,
      },
      targetModel: "Organization",
    };

    await kafkaService.publishActivity(action);

    return res.status(201).json({
      success: true,
      data: organization,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create organization" });
  }
}

export async function getOrganizationStats(req, res) {
  const { organizationId } = req.body;

  try {
    const [totalCustomers, totalSegments, totalCampaigns] = await Promise.all([
      Customer.countDocuments({ organizationId }),
      Segment.countDocuments({ organizationId }),
      Campaign.countDocuments({ organizationId }),
    ]);
    const campaigns = await Campaign.find(
      {
        organizationId,
        successRate: { $exists: true },
      },
      { successRate: 1 }
    ).lean();

    let avgSuccessRate = 0;
    if (campaigns.length > 0) {
      const totalSuccessRate = campaigns.reduce((sum, campaign) => {
        return sum + (campaign.successRate || 0);
      }, 0);

      avgSuccessRate = totalSuccessRate / campaigns.length;
    }

    const organization = await Organization.findById(organizationId).select(
      "name"
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        organizationName: organization.name,
        totalCustomers,
        totalSegments,
        totalCampaigns,
        successRate: avgSuccessRate.toFixed(2),
      },
    });
  } catch (err) {
    console.error("Failed to fetch organization stats:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch organization statistics",
    });
  }
}

export async function getRecentActions(req, res) {
  try {
    const { organizationId } = req.body;
    const userId = req.user.id;

    const actions = await RecentAction.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).sort({ date: -1 });

    if (actions) {
      return res.status(200).json({ success: true, data: { actions } });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "No recent actions found" });
    }
  } catch (err) {
    console.error("Error fetching recent actions:", err);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
}

export async function deleteOrganization(req, res) {
  const { organizationId } = req.body;
  const userId = req.user.id;

  try {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }
    if (organization.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the organization owner can delete it",
      });
    }
    try {
      await Invite.deleteMany({ organizationId });

      await OrganizationMember.deleteMany({ organizationId });

      await Campaign.deleteMany({ organizationId });

      const segments = await Segment.find({ organizationId }, { _id: 1 });
      const segmentIds = segments.map((segment) => segment._id);

      await CustomerSegment.deleteMany({
        segment_id: { $in: segmentIds },
      });

      await Segment.deleteMany({ organizationId });

      await Customer.deleteMany({ organizationId });

      await RecentAction.deleteMany({ organizationId });

      await Organization.findByIdAndDelete(organizationId);

      return res.status(200).json({
        success: true,
        message: "Organization and all associated data deleted successfully",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: `Internal Transactional Error ${err}`,
      });
    }
  } catch (err) {
    console.error("Failed to delete organization:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete organization",
    });
  }
}
