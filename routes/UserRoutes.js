import express from "express";
import {
  handleGoogleLogin,
  login,
  register,
} from "../controllers/UserController.js";

const userrouter = express.Router();

userrouter
  .post("/login", login)
  .post("/register", register)
  .post("/google", handleGoogleLogin);

export default userrouter;
