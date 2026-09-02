import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { seedIfEmpty } from "../src/config/seed.js";

let expressApp;
let initPromise;

async function bootstrap() {
  if (!initPromise) {
    initPromise = (async () => {
      await connectDatabase();
      await seedIfEmpty();
      expressApp = createApp();
    })();
  }
  await initPromise;
  return expressApp;
}

export default async function handler(req, res) {
  try {
    const app = await bootstrap();
    app(req, res);
  } catch (err) {
    console.error("Failed to initialize API:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "API failed to start. Check Vercel env vars (MONGODB_URI, JWT_SECRET, CLIENT_URL).",
        error: "SERVER_INIT_FAILED",
      });
    }
  }
}
