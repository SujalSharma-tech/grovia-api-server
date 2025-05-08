import mongoose from "mongoose";

const SegmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  rules: { required: true, type: Object },
  total_customers: {
    type: Number,
  },
});

const Segment = mongoose.model("Segment", SegmentSchema);
export default Segment;
