import mongoose from "mongoose";
import Campaign from "../models/CampaignSchema.js";

function dbConnect() {
  mongoose
    .connect(`${process.env.MONGO_URI}`)
    .then(() => {
      console.log("Connected to DB...");
    })
    .catch((err) => {
      console.log("Error connecting to Db", err);
    });
}

export default dbConnect;
