import {
  addTeamMember,
  createOrganization,
  getUserOrganizations,
  getOrganizationStats, // Add this import
} from "../controllers/OrganizationController.js";
import {
  createSegment,
  getAllUserSegments,
  getOrganizationSegments,
  updateSegment,
} from "../controllers/SegmentController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";
import {
  requireAdmin,
  requireEditor,
  requireViewer,
} from "../middleware/RoleMiddleware.js";
import express from "express";

const OrganizationRouter = express.Router();

const updateMemberRole = () => {};

OrganizationRouter.post("/organizations", verifyToken, createOrganization)
  .get("/organizations", verifyToken, getUserOrganizations)
  .post(
    "/organizations/:organizationId/members",
    verifyToken,
    requireAdmin,
    addTeamMember
  )
  .put(
    "/organizations/:organizationId/members/:memberId",
    verifyToken,
    requireAdmin,
    updateMemberRole
  )
  .get("/segments", verifyToken, getAllUserSegments)
  .get(
    "/organizations/:organizationId/segments",
    verifyToken,
    requireViewer,
    getOrganizationSegments
  )
  .post(
    "/organizations/:organizationId/segments",
    verifyToken,
    requireEditor,
    createSegment
  )
  .put(
    "/organizations/:organizationId/segments/:segmentId",
    verifyToken,
    requireEditor,
    updateSegment
  )
  .post("/stats", verifyToken, requireViewer, getOrganizationStats);

//   .delete(
//     "/organizations/:organizationId/segments/:segmentId",
//     verifyToken,
//     requireAdmin,
//     deleteSegment
//   );

export default OrganizationRouter;
