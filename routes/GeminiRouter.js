import express from "express";
import {
  convertLanguagetoRules,
  fetchInsightsStatus,
  generateCampaignMessage,
  generateInsights,
} from "../controllers/GeminiController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";
const GeminiRouter = express.Router();

GeminiRouter.post("/segmentrules", convertLanguagetoRules)
  .post("/campaignmessage", generateCampaignMessage)
  .post("/campaigninsights", verifyToken, generateInsights)
  .post("/campaigninsights/status", verifyToken, fetchInsightsStatus);

export default GeminiRouter;
