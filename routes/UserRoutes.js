import express from "express";
import { login, register } from "../controllers/UserController.js";

const userrouter = express.Router();

userrouter.post("/login", login).post("/register", register);

export default userrouter;
