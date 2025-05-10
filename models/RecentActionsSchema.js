import mongoose, { Schema } from "mongoose";

const RecentActionModel = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    index: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  targetActionId: {
    type: Schema.Types.ObjectId,
    ref: "targetModel",
  },
  targetModel: {
    type: String,
    enum: ["Campaign", "Segment", "Customer", "Organization"],
  },
});
RecentActionModel.index({ userId: 1, date: -1 });
RecentActionModel.index({ type: 1, date: -1 });

const RecentAction = mongoose.model("RecentAction", RecentActionModel);
export default RecentAction;
