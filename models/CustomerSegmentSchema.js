import mongoose, { Schema } from "mongoose";

const CustomerSegmentSchema = new mongoose.Schema({
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: "Customer",
  },
  segment_id: {
    type: Schema.Types.ObjectId,
    ref: "Segment",
  },
});

const CustomerSegment = mongoose.model(
  "CustomerSegment",
  CustomerSegmentSchema
);
export default CustomerSegment;
