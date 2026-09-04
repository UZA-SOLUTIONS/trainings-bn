import mongoose from "mongoose";

/**
 * Latest garage telemetry + event history for a candidate's vehicle.
 * Populated by POST /api/garage/:uzaId/updates from the garage system.
 */
const garageUpdateSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: [
        "inspection",
        "service",
        "repair",
        "battery",
        "tyre",
        "software",
        "allocation",
        "shipment",
        "alert",
        "other",
      ],
      default: "other",
    },
    title: { type: String, required: true },
    detail: { type: String, default: "" },
    severity: {
      type: String,
      enum: ["info", "watch", "critical"],
      default: "info",
    },
    source: { type: String, default: "garage" },
  },
  { _id: true },
);

const garageVehicleSchema = new mongoose.Schema(
  {
    candidate_code: { type: String, required: true, unique: true, index: true },
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      default: null,
      index: true,
    },
    plate: { type: String, default: "" },
    vin: { type: String, default: "" },
    model: { type: String, default: "" },
    garage_id: { type: String, default: "" },
    garage_name: { type: String, default: "" },

    health: {
      overall_score: { type: Number, default: 0 },
      battery_percent: { type: Number, default: 0 },
      range_km: { type: Number, default: 0 },
      odometer_km: { type: Number, default: 0 },
      tyre_health_percent: { type: Number, default: 0 },
      last_service_at: { type: Date, default: null },
      next_service_due_km: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ["unknown", "healthy", "attention", "critical", "in_service"],
        default: "unknown",
      },
    },

    updates: { type: [garageUpdateSchema], default: [] },
    last_synced_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const GarageVehicle = mongoose.model("GarageVehicle", garageVehicleSchema);
