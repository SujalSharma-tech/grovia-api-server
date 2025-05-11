import express from "express";
import {
  createInvite,
  getMyInvites,
  acceptInvite,
  rejectInvite,
} from "../controllers/InviteController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";
import { requireAdmin } from "../middleware/RoleMiddleware.js";

const InviteRouter = express.Router();

InviteRouter.post("/invites", verifyToken, requireAdmin, createInvite)
  .get("/invites/me", verifyToken, getMyInvites)
  .post("/invites/accept", verifyToken, acceptInvite)
  .post("/invites/reject", verifyToken, rejectInvite);

export default InviteRouter;
