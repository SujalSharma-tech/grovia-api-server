import express from "express";
import { createCampaign } from "../controllers/CampaignController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";

const CampaignRouter = express.Router();

CampaignRouter.post("/createcampaign", verifyToken, createCampaign);

export default CampaignRouter;
