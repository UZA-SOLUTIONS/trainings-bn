import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 20000,
    family: 4,
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export default mongoose;
