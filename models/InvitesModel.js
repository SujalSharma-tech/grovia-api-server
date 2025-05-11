import mongoose, { Schema } from "mongoose";

const InviteSchema = new mongoose.Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  inviterId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  inviteeId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ["admin", "editor", "viewer"],
    default: "viewer",
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

InviteSchema.index({ organizationId: 1, inviteeId: 1 }, { unique: true });

const Invite = mongoose.model("Invite", InviteSchema);
export default Invite;
