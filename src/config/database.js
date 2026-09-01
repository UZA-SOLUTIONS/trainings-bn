import mongoose from "mongoose";
import { env } from "./env.js";

function atlasTlsHint(err) {
  const servers = err?.reason?.servers;
  if (!servers) return false;
  for (const desc of servers.values()) {
    const msg = String(desc.error?.message || desc.lastErrorMessage || "");
    if (msg.includes("tlsv1 alert internal error")) return true;
  }
  return String(err.message).includes("tlsv1 alert internal error");
}

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      family: 4,
    });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    if (atlasTlsHint(err)) {
      console.error(
        "\nAtlas blocked the connection during TLS handshake.\n" +
          "Fix: MongoDB Atlas → Network Access → Add IP Address → add your current public IP (or 0.0.0.0/0 for dev only).\n" +
          "On Windows, keep using the standard mongodb:// shard URI in MONGODB_URI — not mongodb+srv.\n",
      );
    }
    throw err;
  }
}

export default mongoose;
