import envconfig from "../config/envConfig.js";
import { Kafka } from "kafkajs";
import fs from "fs";
import mongoose from "mongoose";
import dbConnect from "../db/dbConnect.js";
import CustomerSegment from "../models/CustomerSegmentSchema.js";

dbConnect();

const kafka = new Kafka({
  brokers: envconfig.kafka.brokers,
  clientId: "segment-deletion",
  sasl: {
    username: envconfig.kafka.saslUser,
    password: envconfig.kafka.saslPass,
    mechanism: "plain",
  },
  ssl: { ca: [fs.readFileSync("kafkakey.pem", "utf-8")] },
});

const consumer = kafka.consumer({ groupId: "segment-deletion-group" });

try {
  await consumer.connect();

  await consumer.subscribe({
    topic: "segment-topic",
    fromBeginning: true,
  });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      switch (topic) {
        case "segment-topic":
          try {
            const segmentObj = JSON.parse(message.value.toString());
            const segmentId = segmentObj.segment_id;
            await CustomerSegment.deleteMany({ segment_id: segmentId });
          } catch (err) {
            console.error(err);
          }
          break;
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
