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
});

const Customer = mongoose.model("Customer", CustomerSchema);
export default Customer;
