import express from "express";
import {
  createSegment,
  createSegmentPreview,
  updateSegment,
} from "../controllers/SegmentController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";

const SegmentRouter = express.Router();

SegmentRouter.post("/createsegment/preview", verifyToken, createSegmentPreview)
  .post("/createsegment", verifyToken, createSegment)
  .post("/updatesegment/:segmentId", verifyToken, updateSegment);

export default SegmentRouter;
