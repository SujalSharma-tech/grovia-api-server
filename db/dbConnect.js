import mongoose from "mongoose";

function dbConnect() {
  mongoose
    .connect("mongodb://localhost:27017/grovia")
    .then(() => {
      console.log("Connected to DB...");
    })
    .catch((err) => {
      console.log("Error connecting to Db", err);
    });
}

export default dbConnect;
