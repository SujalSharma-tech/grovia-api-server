import express from "express";
import {
  convertLanguagetoRules,
  generateCampaignMessage,
} from "../controllers/GeminiController.js";
const GeminiRouter = express.Router();

GeminiRouter.post("/segmentrules", convertLanguagetoRules).post(
  "/campaignmessage",
  generateCampaignMessage
);

export default GeminiRouter;
