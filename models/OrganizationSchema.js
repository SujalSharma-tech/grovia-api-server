import mongoose, { Schema } from "mongoose";

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Organization = mongoose.model("Organization", OrganizationSchema);
export default Organization;
