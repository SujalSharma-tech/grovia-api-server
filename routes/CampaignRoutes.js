import express from "express";
import {
  createCampaign,
  getAllOrganizationCampaigns,
} from "../controllers/CampaignController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";

const CampaignRouter = express.Router();

CampaignRouter.post("/createcampaign", verifyToken, createCampaign).post(
  "/getcampaigns",
  verifyToken,
  getAllOrganizationCampaigns
);

export default CampaignRouter;
