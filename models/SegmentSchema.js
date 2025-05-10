import mongoose from "mongoose";

const SegmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  rules: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  total_customers: {
    type: Number,
    default: 0,
  },

  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Segment = mongoose.model("Segment", SegmentSchema);
export default Segment;
