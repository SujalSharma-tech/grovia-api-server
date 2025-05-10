dotenv.config();

import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET;

import dotenv from "dotenv";

export const generateToken = (user) => {
  return jwt.sign(user, SECRET, {
    expiresIn: "7d",
  });
};

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null)
    return res.status(401).json({ success: false, message: "Token not found" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }
    req.user = user;
    next();
  });
};
