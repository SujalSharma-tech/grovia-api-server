import Invite from "../models/InvitesModel.js";
import User from "../models/UserSchema.js";
import Organization from "../models/OrganizationSchema.js";
import OrganizationMember from "../models/OrganizationMemberSchema.js";
import RecentAction from "../models/RecentActionsSchema.js";

export async function createInvite(req, res) {
  const { email, role, organizationId } = req.body;
  const inviterId = req.user.id;

  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(400).json({
        success: false,
        message: "Organization not found",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const existingMember = await OrganizationMember.findOne({
      organizationId,
      userId: user._id,
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this organization",
      });
    }

    const existingInvite = await Invite.findOne({
      organizationId,
      inviteeId: user._id,
      status: "pending",
    });

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        message: "Invite already sent to this user",
      });
    }

    const invite = await Invite.create({
      organizationId,
      inviterId,
      inviteeId: user._id,
      role,
    });

    await RecentAction.create({
      title: "Invite Sent",
      description: `Invitation sent to ${user.fullname} to join as ${role}`,
      type: "invite_sent",
      userId: inviterId,
      organizationId,
      createdBy: {
        email: req.user.email,
        fullname: req.user.name,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Invitation sent successfully",
      data: invite,
    });
  } catch (err) {
    console.error("Failed to send invite:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send invite",
    });
  }
}

export async function getMyInvites(req, res) {
  const userId = req.user.id;

  try {
    const invites = await Invite.find({
      inviteeId: userId,
      status: "pending",
    })
      .populate("organizationId", "name")
      .populate("inviterId", "fullname email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: invites,
    });
  } catch (err) {
    console.error("Failed to fetch invites:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch invites",
    });
  }
}

export async function acceptInvite(req, res) {
  const { inviteId } = req.body;
  const userId = req.user.id;

  try {
    const invite = await Invite.findOne({
      _id: inviteId,
      inviteeId: userId,
      status: "pending",
    }).populate("organizationId", "name");

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite",
      });
    }

    await OrganizationMember.create({
      organizationId: invite.organizationId._id,
      userId,
      role: invite.role,
    });

    invite.status = "accepted";
    await invite.save();

    await RecentAction.create({
      title: "Joined Organization",
      description: `Joined ${invite.organizationId.name} as ${invite.role}`,
      type: "invite_accepted",
      userId,
      organizationId: invite.organizationId._id,
      createdBy: {
        email: req.user.email,
        fullname: req.user.name,
      },
    });

    return res.status(200).json({
      success: true,
      message: `You've been added to ${invite.organizationId.name}`,
    });
  } catch (err) {
    console.error("Failed to accept invite:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to process invite",
    });
  }
}
export async function rejectInvite(req, res) {
  const { inviteId } = req.body;
  const userId = req.user.id;

  try {
    const invite = await Invite.findOneAndUpdate(
      {
        _id: inviteId,
        inviteeId: userId,
        status: "pending",
      },
      { status: "rejected" },
      { new: true }
    ).populate("organizationId", "name");

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Invitation from ${invite.organizationId.name} rejected`,
    });
  } catch (err) {
    console.error("Failed to reject invite:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to process invite",
    });
  }
}
