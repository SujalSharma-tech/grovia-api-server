import express from "express";
import {
  createCampaign,
  deleteCampaign,
  getAllOrganizationCampaigns,
} from "../controllers/CampaignController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";
import {
  requireAdmin,
  requireEditor,
  requireViewer,
} from "../middleware/RoleMiddleware.js";

const CampaignRouter = express.Router();

CampaignRouter.post(
  "/createcampaign",
  verifyToken,
  requireEditor,
  createCampaign
)
  .post(
    "/getcampaigns",
    verifyToken,
    requireViewer,
    getAllOrganizationCampaigns
  )
  .post("/deletecampaign", verifyToken, requireAdmin, deleteCampaign);

export default CampaignRouter;
