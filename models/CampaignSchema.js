import mongoose, { Schema } from "mongoose";

const STATUS = [];
const CampaignSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  audience_size: {
    type: Number,
  },
  status: {
    type: String,
    enum: ["SUCCESS", "FAILED", "PENDING", "DRAFT"],
  },
  segment_id: {
    type: Schema.Types.ObjectId,
    ref: "Segment",
  },
  sent: {
    type: Number,
  },
  failed: {
    type: Number,
  },
  successRate: {
    type: Number,
  },
});

const Campaign = mongoose.model("Campaign", CampaignSchema);
export default Campaign;
