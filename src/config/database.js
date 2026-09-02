import mongoose from "mongoose";
import { env } from "./env.js";

const globalCache = globalThis;

if (!globalCache.__uzaMongoose) {
  globalCache.__uzaMongoose = { conn: null, promise: null };
}

const cached = globalCache.__uzaMongoose;

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

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 20000,
        ...(process.env.VERCEL ? {} : { family: 4 }),
      })
      .then((mongooseInstance) => {
        console.log(`MongoDB connected: ${mongooseInstance.connection.name}`);
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
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
