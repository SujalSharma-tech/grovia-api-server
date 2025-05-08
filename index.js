dotenv.config();
import dbConnect from "./db/dbConnect.js";
import dotenv from "dotenv";
import multer from "multer";

import app from "./app.js";
const PORT = process.env.PORT || 8000;
export const uploadCSV = multer({ dest: "uploads/" });

dbConnect();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
