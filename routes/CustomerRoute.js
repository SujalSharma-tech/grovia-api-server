import express from "express";
import {
  createCustomer,
  handleCsvUploads,
} from "../controllers/CustomerController.js";
import multer from "multer";
import { verifyToken } from "../middleware/AuthMiddleware.js";
export const uploadCSV = multer({ dest: "uploads/" });

const CustomerRouter = express.Router();

CustomerRouter.post(
  "/csv",
  verifyToken,
  uploadCSV.single("file"),
  handleCsvUploads
).post("/insertcustomer", verifyToken, createCustomer);

export default CustomerRouter;
