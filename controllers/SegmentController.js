import Customer from "../models/CustomerSchema.js";
import CustomerSegment from "../models/CustomerSegmentSchema.js";
import Segment from "../models/SegmentSchema.js";
import RecentAction from "../models/RecentActionsSchema.js";
import OrganizationMember from "../models/OrganizationMemberSchema.js";

function convertRuleToDBQuery(rule) {
  if (!rule) return {};

  if (rule.field && rule.operator && rule.value !== undefined) {
    const { field, operator, value } = rule;

    switch (operator) {
      case "equal":
        return { [field]: value };
      case "notEqual":
        return { [field]: { $ne: value } };
      case "greaterThan":
        return { [field]: { $gt: value } };
      case "greaterThanOrEqual":
        return { [field]: { $gte: value } };
      case "lessThan":
        return { [field]: { $lt: value } };
      case "lessThanOrEqual":
        return { [field]: { $lte: value } };
      default:
        console.warn(`Unsupported operator: ${operator}`);
        return {};
    }
  }

  if (Array.isArray(rule.conditions) && rule.operator) {
    const mongoSubQueries = rule.conditions.map(convertRuleToDBQuery);
    const mongoOperator = rule.operator === "AND" ? "$and" : "$or";
    return { [mongoOperator]: mongoSubQueries };
  }

  return {};
}

export async function createSegmentPreview(req, res) {
  const { title, description, rules } = req.body;

  try {
    const query = convertRuleToDBQuery(rules);
    console.log(JSON.stringify(query, null, 2));
    let customers = await Customer.find(query).countDocuments();
    res.json({ customers });
  } catch (err) {
    console.error(err);
  }
}

export async function createSegment(req, res) {
  const { title, description, rules } = req.body;
  const { organizationId } = req.params;
  const userId = req.user.id;

  try {
    const query = convertRuleToDBQuery(rules);
    let customers = await Customer.find(query, { _id: 1 }).lean();
    const customerIds = customers.map((cust) => cust._id);

    let segment = await Segment.insertOne({
      title,
      description,
      rules,
      organizationId,
      createdBy: userId,
    });

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

    await RecentAction.create({
      title: "Segment Created",
      description: `Segment "${title}" was created`,
      type: "segment_created",
      userId: userId,
      targetActionId: segment._id,
      targetModel: "Segment",
    });

    res.status(200).json({
      success: true,
      message: "Segment created successfully",
      data: segment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create segment" });
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

export async function getAllUserSegments(req, res) {
  const userId = req.user.id;

  try {
    const memberships = await OrganizationMember.find({ userId });
    const organizationIds = memberships.map((m) => m.organizationId);

    const segments = await Segment.find({
      organizationId: { $in: organizationIds },
    }).populate("organizationId", "name");

    return res.status(200).json({
      success: true,
      data: segments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch segments" });
  }
}

export async function getOrganizationSegments(req, res) {
  const { organizationId } = req.params;

  try {
    const segments = await Segment.find({ organizationId });
    return res.status(200).json({
      success: true,
      data: segments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch segments" });
  }
}
