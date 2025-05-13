import mongoose from "mongoose";

const InsightSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ["PENDING", "COMPLETED", "FAILED"],
  },
  content: {
    type: String,
  },
  OrganizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const InsightModel = mongoose.model("Insight", InsightSchema);
export default InsightModel;
