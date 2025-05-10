import Organization from "../models/OrganizationSchema.js";
import OrganizationMember from "../models/OrganizationMemberSchema.js";
import User from "../models/UserSchema.js";
import RecentAction from "../models/RecentActionsSchema.js";
import Segment from "../models/SegmentSchema.js";
import Customer from "../models/CustomerSchema.js";
import Campaign from "../models/CampaignSchema.js";

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

    await RecentAction.create({
      title: "Organization Created",
      description: `Organization "${name}" was created`,
      type: "organization_created",
      userId,
      targetActionId: organization._id,
      targetModel: "Organization",
    });

    return res.status(201).json({
      success: true,
      data: organization,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create organization" });
  }
}

export async function addTeamMember(req, res) {
  const { organizationId } = req.params;
  const { email, role } = req.body;
  const inviterId = req.user.id;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await OrganizationMember.create({
      organizationId,
      userId: user._id,
      role,
    });

    await RecentAction.create({
      title: "Team Member Added",
      description: `${user.fullname} was added as ${role}`,
      type: "member_added",
      userId: inviterId,
      targetActionId: organizationId,
      targetModel: "Organization",
    });

    return res.status(200).json({
      success: true,
      message: "Team member added successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add team member" });
  }
}

/**
 * Get dashboard stats for an organization
 */
export async function getOrganizationStats(req, res) {
  const { organizationId } = req.body;
  console.log(organizationId);

  try {
    // Run all count queries in parallel for efficiency
    const [totalCustomers, totalSegments, totalCampaigns] = await Promise.all([
      Customer.countDocuments({ organizationId }),
      Segment.countDocuments({ organizationId }),
      Campaign.countDocuments({ organizationId }),
    ]);
    const campaigns = await Campaign.find(
      {
        organizationId,
        successRate: { $exists: true }, // Only include campaigns with success rate
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

    // Get organization details
    const organization = await Organization.findById(organizationId).select(
      "name"
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Return all stats together
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
