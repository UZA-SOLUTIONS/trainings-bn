import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { seedIfEmpty } from "./config/seed.js";

async function main() {
  await connectDatabase();
  await seedIfEmpty();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`UZA Mobility API listening on http://localhost:${env.PORT}`);
    console.log(`CORS origin: ${env.CLIENT_URL}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
