import Customer from "../models/CustomerSchema.js";
import CustomerSegment from "../models/CustomerSegmentSchema.js";
import Segment from "../models/SegmentSchema.js";
import OrganizationMember from "../models/OrganizationMemberSchema.js";
import kafkaService from "../services/KafkaService.js";

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
    let customers = await Customer.find(query).countDocuments();
    res.json({ success: true, data: { customers } });
  } catch (err) {
    console.error(err);
  }
}

export async function createSegment(req, res) {
  const { title, description, rules, organizationId } = req.body;
  const userId = req.user.id;

  try {
    const query = convertRuleToDBQuery(rules);
    let customers = await Customer.find(query, { _id: 1 }).lean();
    const customerIds = customers.map((cust) => cust._id);

    let segment = await Segment.create({
      title,
      description,
      rules,
      organizationId,
      createdBy: userId,
      total_customers: customers.length,
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

    const action = {
      title: "Segment Created",
      description: `Segment "${title}" was created`,
      type: "segment_created",
      organizationId: organizationId,
      createdBy: {
        email: req.user.email,
        fullname: req.user.name,
      },
      userId: userId,
      targetActionId: segment._id,
      targetModel: "Segment",
    };

    await kafkaService.publishActivity(action);

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
  const { title, description, rules, segmentId, organizationId } = req.body;

  try {
    if (!title || !description || !segmentId || !rules) {
      return res.status(400).json({
        message: "Title, Description, segmentId and rules are required",
        success: false,
      });
    }
    const query = convertRuleToDBQuery(rules);

    const customers = await Customer.find(query, { _id: 1 }).lean();
    const customerIds = customers.map((customer) => customer._id);

    const segment = await Segment.findByIdAndUpdate(
      segmentId,
      {
        $set: {
          title,
          description,
          rules,
        },
      },
      { new: true }
    );

    await CustomerSegment.deleteMany({ segment_id: segmentId });

    const newMappings = customerIds.map((customerId) => ({
      customer_id: customerId,
      segment_id: segmentId,
    }));
    await CustomerSegment.insertMany(newMappings, { ordered: false });

    await Segment.findByIdAndUpdate(segmentId, {
      $set: { total_customers: customerIds.length },
    });

    const action = {
      title: "Segment Updated",
      description: `Segment "${title}" was updated`,
      type: "segment_updated",
      organizationId: organizationId,
      createdBy: {
        email: req.user.email,
        fullname: req.user.name,
      },
      userId: req.user.id,
      targetActionId: segment._id,
      targetModel: "Segment",
    };
    await kafkaService.publishActivity(action);

    return res.status(200).json({
      message: "Segment updated and remapped successfully",
      total_customers: customerIds.length,
      success: true,
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
  const { organizationId } = req.body;
  const userId = req.user.id;

  try {
    const userRole = req.userRole;
    const canEdit = userRole === "admin" || userRole === "editor";
    const canDelete = userRole === "admin";

    let segments = await Segment.find({ organizationId }).sort({
      updatedAt: -1,
    });

    segments = segments.map((segment) => ({
      ...segment.toObject(),
      userRole,
      canEdit,
      canDelete,
    }));
    return res.status(200).json({
      success: true,
      data: segments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch segments" });
  }
}

export async function deleteSegment(req, res) {
  const { segmentId, organizationId } = req.body;
  const userId = req.user.id;

  try {
    const segment = await Segment.findById(segmentId);

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: "Segment not found",
      });
    }
    const publishSegmentDelete = await kafkaService.publishSegmentDelete(
      segmentId
    );
    if (!publishSegmentDelete) {
      console.log("Error publishing deleting message");
    }

    await Segment.findByIdAndDelete(segmentId);
    const action = {
      title: "Segment Deleted",
      description: `Segment "${segment.title}" was deleted`,
      type: "segment_deleted",
      organizationId,
      userId,
      createdBy: {
        email: req.user.email,
        fullname: req.user.name,
      },
      targetModel: "Segment",
    };
    await kafkaService.publishActivity(action);

    return res.status(200).json({
      success: true,
      message: "Segment deleted successfully",
    });
  } catch (err) {
    console.error("Failed to delete segment:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete segment",
    });
  }
}
