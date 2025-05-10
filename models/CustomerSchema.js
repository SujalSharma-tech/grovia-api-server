import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required!"],
  },
  email: {
    type: String,
    required: [true, "Email is required!"],
  },
  visit_count: {
    type: Number,
  },
  lastpurchase_day: {
    type: Number,
  },
  totalspend: {
    type: Number,
  },
  days_inactive: {
    type: Number,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Customer = mongoose.model("Customer", CustomerSchema);
export default Customer;
