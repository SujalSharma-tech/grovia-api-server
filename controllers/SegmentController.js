import Customer from "../models/CustomerSchema.js";
import CustomerSegment from "../models/CustomerSegmentSchema.js";
import Segment from "../models/SegmentSchema.js";

function convertRuleToDBQuery(rule) {
  if (rule.field && rule.operator && rule.value != undefined) {
    const { field, operator, value } = rule;

    switch (operator) {
      case "greaterThan":
        return { [field]: { $gt: value } };
      case "equal":
        return { [field]: value };
      case "lessThan":
        return { [field]: { $lt: value } };
      default:
        return {};
    }
  }

  if (rule.operator && Array.isArray(rule.conditions)) {
    const subQueries = rule.conditions.map(convertRuleToDBQuery);
    const oper = rule.operator === "AND" ? "$and" : "$or";
    return { [oper]: subQueries };
  }

  return {};
}

export async function createSegmentPreview(req, res) {
  const { title, description, rules } = req.body;

  try {
    const query = convertRuleToDBQuery(rules);
    let customers = await Customer.find(query).countDocuments();
    res.json({ customers });
  } catch (err) {
    console.error(err);
  }
}

export async function createSegment(req, res) {
  const { title, description, rules } = req.body;
  try {
    const query = convertRuleToDBQuery(rules);
    let customers = await Customer.find(query, { _id: 1 }).lean();
    const customerIds = customers.map((cust) => cust._id);
    if (customerIds.length === 0) {
      return res.status(200).json({ message: "No customers match the rule." });
    }
    let segment = await Segment.insertOne({ title, description, rules });
    if (!segment) {
      return res.status(400).json({ message: "Segment creation failed" });
    }

    const customer_segment_mapping = customerIds.map((customerId) => {
      return { customer_id: customerId, segment_id: segment._id };
    });

    const insertedCustomers = await CustomerSegment.insertMany(
      customer_segment_mapping,
      { ordered: false }
    );

    const totalMapped = await CustomerSegment.countDocuments({
      segment_id: segment._id,
    });

    await Segment.findByIdAndUpdate(segment._id, {
      $set: { total_customers: totalMapped },
    });

    res.status(200).json({
      success: true,
      message: "Customers Added to Segment Successfully",
    });
  } catch (err) {
    console.error(err);
  }
}

export async function updateSegment(req, res) {
  const { segmentId } = req.params;
  const { title, description, rules } = req.body;

  try {
    const query = convertRuleToDBQuery(rules);

    const customers = await Customer.find(query, { _id: 1 }).lean();
    const customerIds = customers.map((customer) => customer._id);

    await Segment.findByIdAndUpdate(segmentId, {
      $set: {
        title,
        description,
        rules,
      },
    });

    await CustomerSegment.deleteMany({ segment_id: segmentId });

    const newMappings = customerIds.map((customerId) => ({
      customer_id: customerId,
      segment_id: segmentId,
    }));
    await CustomerSegment.insertMany(newMappings, { ordered: false });

    await Segment.findByIdAndUpdate(segmentId, {
      $set: { total_customers: customerIds.length },
    });

    return res.status(200).json({
      message: "Segment updated and remapped successfully",
      total_customers: customerIds.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update segment" });
  }
}
