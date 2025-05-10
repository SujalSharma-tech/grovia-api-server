import mongoose, { Schema } from "mongoose";

const MessageLogs = new mongoose.Schema({
  campaign_id: {
    type: Schema.Types.ObjectId,
    ref: "Campaign",
    required: true,
  },
  user_name: {
    type: String,
    required: true,
  },
  user_email: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["SENT", "FAILED", "PENDING"],
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

const MessageLog = mongoose.model("MessageLog", MessageLogs);
export default MessageLog;
