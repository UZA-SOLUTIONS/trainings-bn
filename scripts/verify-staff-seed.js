import { connectDatabase } from "../src/config/database.js";
import { seedIfEmpty } from "../src/config/seed.js";
import { StaffUser } from "../src/models/StaffUser.js";
import mongoose from "mongoose";

await connectDatabase();
console.log("--- First seed run ---");
await seedIfEmpty();
console.log("--- Second seed run (idempotent) ---");
await seedIfEmpty();

const staff = await StaffUser.find().select("email role").sort({ email: 1 }).lean();
console.log("Staff in DB:", staff.map((s) => `${s.email} (${s.role})`).join(", "));
console.log("Count:", staff.length);

await mongoose.disconnect();
