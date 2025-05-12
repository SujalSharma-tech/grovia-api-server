import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export default {
  kafka: {
    brokers: ["kafka-7072096-vermaaman1569-35bc.i.aivencloud.com:21869"],
    saslUser: process.env.SASL_USER,
    saslPass: process.env.SASL_PASS,
  },
  mongoUri: process.env.MONGO_URI,
};
