import mongoose from "mongoose";

const UserSegmentModel = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  segment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Segment",
  },
  role: {
    type: String,
    enum: ["admin", "editor", "viewer"],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

const UserSegment = mongoose.model("UserSegment", UserSegmentModel);
export default UserSegment;
