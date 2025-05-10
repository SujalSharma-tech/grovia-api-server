import mongoose from "mongoose";
import Campaign from "../models/CampaignSchema.js";

function dbConnect() {
  mongoose
    .connect("mongodb://localhost:27017/grovia")
    .then(() => {
      console.log("Connected to DB...");
    })
    .catch((err) => {
      console.log("Error connecting to Db", err);
    });

  // async function migrateCustomers() {
  //   try {
  //     // Check for at least one organization

  //     // Get count of customers without organizationId
  //     const customersToMigrate = await Campaign.countDocuments({
  //       $or: [{ organizationId: { $exists: false } }, { organizationId: null }],
  //     });

  //     console.log(
  //       `Found ${customersToMigrate} customers without organizationId`
  //     );
  //     const result = await Campaign.updateMany(
  //       {
  //         $or: [
  //           { organizationId: { $exists: false } },
  //           { organizationId: null },
  //         ],
  //       },
  //       { $set: { organizationId: "681fbaa682cec88e1a5c6f28" } }
  //     );
  //     console.log(
  //       `Updated ${result.modifiedCount} customers to organization: "681fbaa682cec88e1a5c6f28`
  //     );
  //     console.log("Migration complete");
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }

  // migrateCustomers();
}

export default dbConnect;
