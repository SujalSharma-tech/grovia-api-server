import path from "path";
import fs from "fs";
import csv from "csv-parser";
import Customer from "../models/CustomerSchema.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handleCsvUploads(req, res) {
  const results = [];

  const filepath = path.join(__dirname, "..", req.file.path);

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
      });
    })
    .on("end", async () => {
      try {
        await Customer.insertMany(results);
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
  } = req.body;

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
      days_inactive,
    });

    res
      .status(200)
      .json({ success: true, message: "Customer added successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: `Invalid request ${err}` });
  }
}
