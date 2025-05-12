import envconfig from "../config/envConfig.js";
import { Kafka } from "kafkajs";
import fs from "fs";
import mongoose from "mongoose";
import dbConnect from "../db/dbConnect.js";
import RecentAction from "../models/RecentActionsSchema.js";

dbConnect();

const kafka = new Kafka({
  brokers: envconfig.kafka.brokers,
  clientId: "campaign-processor",
  sasl: {
    username: envconfig.kafka.saslUser,
    password: envconfig.kafka.saslPass,
    mechanism: "plain",
  },
  ssl: { ca: [fs.readFileSync("kafkakey.pem", "utf-8")] },
});

const consumer = kafka.consumer({ groupId: "recent-activity-group" });

try {
  await consumer.connect();

  await consumer.subscribe({
    topic: "recent-activities-topic",
    fromBeginning: true,
  });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const activity = JSON.parse(message.value.toString());
        await RecentAction.create(activity);
      } catch (err) {
        console.error(err);
      }
    },
  });
} catch (err) {}

process.on("SIGTERM", async () => {
  console.log("Shutting down consumer");
  await consumer.disconnect();
  mongoose.disconnect();
  process.exit(0);
});
