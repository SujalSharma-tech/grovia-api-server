import { Kafka } from "kafkajs";
import fs from "fs";
import dotenv from "dotenv";
import envConfig from "../config/envConfig.js";
dotenv.config();

class KafkaService {
  constructor() {
    this.kafka = new Kafka({
      brokers: envConfig.kafka.brokers,
      clientId: "xeno-grovia-server",
      sasl: {
        username: envConfig.kafka.saslUser,
        password: envConfig.kafka.saslPass,
        mechanism: "plain",
      },
      ssl: { ca: [fs.readFileSync("kafkakey.pem", "utf-8")] },
    });
    this.producer = this.kafka.producer();
    this.isConnected = false;
  }

  async producerConnect() {
    if (!this.isConnected) {
      try {
        await this.producer.connect();
        this.isConnected = true;
        console.log("Connected kafka producer");
      } catch (err) {
        console.log(`Error connecting kafka producer: ${err}`);
      }
    }
  }

  async publishActivity(activity) {
    try {
      if (!this.isConnected) {
        await this.producerConnect();
      }
      console.log(activity);
      await this.producer.send({
        topic: "recent-activities-topic",
        messages: [
          {
            key: JSON.stringify(activity.targetActionId),
            value: JSON.stringify(activity),
          },
        ],
      });
      return true;
    } catch (err) {
      console.log(`Error publishing activity: ${err}`);
      return false;
    }
  }

  async producerDisconnect() {
    if (this.isConnected) {
      try {
        await this.producer.disconnect();
        this.isConnected = false;
        console.log("Disconnected kafka producer");
      } catch (err) {
        console.log(`Error disconnecting producer: ${err}`);
      }
    }
  }
}

const kafkaService = new KafkaService();

(async () => {
  try {
    await kafkaService.producerConnect();
  } catch (err) {
    console.log(`Kafka Connection failed: ${err}`);
  }
})();

export default kafkaService;
