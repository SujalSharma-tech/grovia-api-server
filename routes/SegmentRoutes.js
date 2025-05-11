import express from "express";
import {
  createSegment,
  createSegmentPreview,
  deleteSegment,
  getOrganizationSegments,
  updateSegment,
} from "../controllers/SegmentController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";
import {
  requireAdmin,
  requireEditor,
  requireViewer,
} from "../middleware/RoleMiddleware.js";

const SegmentRouter = express.Router();

SegmentRouter.post("/createsegment/preview", verifyToken, createSegmentPreview)
  .post("/createsegment", verifyToken, requireEditor, createSegment)
  .post("/updatesegment/:segmentId", verifyToken, requireEditor, updateSegment)
  .post("/getsegments", verifyToken, requireViewer, getOrganizationSegments)
  .post("/deletesegment", verifyToken, requireAdmin, deleteSegment);

export default SegmentRouter;
