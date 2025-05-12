import { Kafka } from "kafkajs";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

class KafkaService {
  constructor() {
    this.kafka = new Kafka({
      brokers: ["kafka-7072096-vermaaman1569-35bc.i.aivencloud.com:21869"],
      clientId: "xeno-grovia-server",
      sasl: {
        username: `${process.env.SASL_USER}`,
        password: `${process.env.SASL_PASS}`,
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

  async publishBatchData(batchdata) {
    try {
      if (!this.isConnected) {
        await this.producerConnect();
      }
      await this.producer.send({
        topic: "campaign-batch-data-topic",
        messages: [
          {
            key: JSON.stringify(batchdata.campaignId),
            value: JSON.stringify(batchdata),
          },
        ],
      });

      return true;
    } catch (err) {
      console.log(`Error publishing batch data: ${err}`);
      return false;
    }
  }

  async publishSegmentDelete(segmentId) {
    try {
      if (!this.isConnected) {
        await this.producerConnect();
      }
      await this.producer.send({
        topic: "segment-topic",
        messages: [
          {
            key: "segmentdelete",
            value: JSON.stringify({ segment_id: segmentId }),
          },
        ],
      });
      return true;
    } catch (err) {
      console.log(`Error publishing segment delete: ${err}`);
      return false;
    }
  }

  async publishDelete(campaignId) {
    try {
      if (!this.isConnected) {
        await this.producerConnect();
      }
      await this.producer.send({
        topic: "message-log-topic",
        messages: [
          {
            key: "Delete",
            value: JSON.stringify({ campaignId: campaignId }),
          },
        ],
      });

      return true;
    } catch (err) {
      console.log(`Error publishing Message Deletion data: ${err}`);
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
