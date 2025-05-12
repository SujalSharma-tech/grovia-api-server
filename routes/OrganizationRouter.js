import {
  createOrganization,
  getUserOrganizations,
  getOrganizationStats,
  getRecentActions,
  getOrganizationMembers,
  deleteOrganization,
} from "../controllers/OrganizationController.js";
import { getAllUserSegments } from "../controllers/SegmentController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";
import { requireAdmin, requireViewer } from "../middleware/RoleMiddleware.js";
import express from "express";

const OrganizationRouter = express.Router();

OrganizationRouter.post("/organizations", verifyToken, createOrganization)
  .get("/organizations", verifyToken, getUserOrganizations)
  .get("/segments", verifyToken, getAllUserSegments)
  .post("/stats", verifyToken, requireViewer, getOrganizationStats)
  .post("/recentactions", verifyToken, requireViewer, getRecentActions)
  .post("/members", verifyToken, requireViewer, getOrganizationMembers)
  .post("/deleteorganization", verifyToken, requireAdmin, deleteOrganization);

export default OrganizationRouter;
