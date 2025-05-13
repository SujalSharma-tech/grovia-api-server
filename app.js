import express from "express";
import userrouter from "./routes/UserRoutes.js";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import CustomerRouter from "./routes/CustomerRoute.js";
import SegmentRouter from "./routes/SegmentRoutes.js";
import CampaignRouter from "./routes/CampaignRoutes.js";
import GeminiRouter from "./routes/GeminiRouter.js";
import OrganizationRouter from "./routes/OrganizationRouter.js";
import InviteRouter from "./routes/InviteRouter.js";
dotenv.config();
const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  })
);
export const uploadCSV = multer({ dest: "uploads/" });
app.use("/api/user", userrouter);
app.use("/api/organization", OrganizationRouter);
app.use("/api/invite", InviteRouter);
app.use("/api/customer", CustomerRouter);
app.use("/api/segment", SegmentRouter);
app.use("/api/campaign", CampaignRouter);
app.use("/api/ai", GeminiRouter);

export default app;
