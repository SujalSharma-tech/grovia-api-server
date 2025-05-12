import path from "path";
import fs from "fs";
import csv from "csv-parser";
import Customer from "../models/CustomerSchema.js";
import { fileURLToPath } from "url";
import RecentAction from "../models/RecentActionsSchema.js";
import kafkaService from "../services/KafkaService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handleCsvUploads(req, res) {
  const { organizationId } = req.body;
  const userId = req.user.id;

  const results = [];
  const requiredHeaders = [
    "name",
    "email",
    "visit_count",
    "lastpurchase_day",
    "totalspend",
    "days_inactive",
  ];

  const filepath = path.join(__dirname, "..", req.file.path);
  const firstLine = fs
    .readFileSync(filepath, "utf-8")
    .split("\n")[0]
    .toLowerCase();
  const hasHeaders = firstLine.includes("name") && firstLine.includes("email");
  if (hasHeaders) {
    const headerFields = firstLine.split(",").map((field) => field.trim());
    const missingHeaders = requiredHeaders.filter(
      (field) => !headerFields.includes(field)
    );

    if (missingHeaders.length > 0) {
      fs.unlinkSync(filepath);
      return res.status(400).json({
        success: false,
        message: `CSV missing required headers: ${missingHeaders.join(", ")}`,
        requiredFormat: requiredHeaders.join(", "),
      });
    }
  }

  fs.createReadStream(filepath)
    .pipe(
      csv({
        headers: [
          "name",
          "email",
          "visit_count",
          "lastpurchase_day",
          "totalspend",
          "days_inactive",
        ],
        skipLines: hasHeaders ? 1 : 0,
      })
    )
    .on("data", (data) => {
      results.push({
        name: data.name,
        email: data.email,
        visit_count: Number(data.visit_count) || 0,
        lastpurchase_day: Number(data.lastpurchase_day) || 0,
        totalspend: Number(data.totalspend) || 0,
        days_inactive: Number(data.days_inactive) || 0,
        organizationId,
      });
    })
    .on("end", async () => {
      try {
        await Customer.insertMany(results);
        await RecentAction.create({
          title: "Customer Import",
          description: `Imported ${results.length} customers from CSV file`,
          type: "add_customer",
          organizationId,
          userId,
          createdBy: {
            email: req.user.email,
            fullname: req.user.name,
          },
        });

        fs.unlinkSync(filepath);
        res.status(201).send({
          success: true,
          message: "Customers uploaded successfully to database",
        });
      } catch (err) {
        res
          .status(500)
          .json({ success: false, message: `Database error ${err}` });
      }
    });
}

export async function createCustomer(req, res) {
  const {
    name,
    email,
    visit_count,
    lastpurchase_day,
    totalspend,
    days_inactive,
    organizationId,
  } = req.body;
  const userId = req.user.id;

  try {
    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Name and email are required" });
    }

    let customer = await Customer.findOne({ email });
    if (customer) {
      return res
        .status(400)
        .json({ success: false, message: "Customer already exists" });
    }
    customer = await Customer.insertOne({
      name,
      email,
      visit_count,
      lastpurchase_day,
      totalspend,
      organizationId,
      days_inactive,
    });

    const action = {
      title: "Customer Added",
      description: `Customer '${customer.name}' added`,
      type: "add_customer",
      organizationId,
      userId,
      createdBy: {
        email: req.user.email,
        fullname: req.user.name,
      },
      targetActionId: customer._id,
      targetModel: "Customer",
    };

    const published = await kafkaService.publishActivity(action);
    if (!published) {
      await RecentAction.create({
        title: "Customer Added",
        description: `Customer '${customer.name}' added`,
        type: "add_customer",
        organizationId,
        userId,
        createdBy: {
          email: req.user.email,
          fullname: req.user.name,
        },
        targetActionId: customer._id,
        targetModel: "Customer",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer added successfully",
      data: { customer },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: `Invalid request ${err}` });
  }
}
