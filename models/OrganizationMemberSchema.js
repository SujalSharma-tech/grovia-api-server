import mongoose from "mongoose";

const OrganizationMemberSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "editor", "viewer"],
    default: "viewer",
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

OrganizationMemberSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true }
);

const OrganizationMember = mongoose.model(
  "OrganizationMember",
  OrganizationMemberSchema
);
export default OrganizationMember;
