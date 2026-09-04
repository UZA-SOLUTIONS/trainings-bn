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
        "diagnosis",
        "service",
        "repair",
        "battery",
        "motor",
        "brake",
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

/** Full EV diagnosis snapshot — garage should send every field they can measure. */
const healthSchema = new mongoose.Schema(
  {
    overall_score: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["unknown", "healthy", "attention", "critical", "in_service"],
      default: "unknown",
    },

    // —— Battery / HV pack ——
    battery_percent: { type: Number, default: 0 }, // SOC
    battery_soh_percent: { type: Number, default: 0 }, // State of Health
    battery_temp_c: { type: Number, default: 0 },
    battery_cell_diff_mv: { type: Number, default: 0 },
    charge_cycles: { type: Number, default: 0 },
    charging_status: {
      type: String,
      enum: ["unknown", "idle", "charging", "full", "fault"],
      default: "unknown",
    },
    range_km: { type: Number, default: 0 },

    // —— Powertrain ——
    motor_health_percent: { type: Number, default: 0 },
    inverter_health_percent: { type: Number, default: 0 },
    coolant_temp_c: { type: Number, default: 0 },

    // —— Chassis ——
    tyre_health_percent: { type: Number, default: 0 },
    tyre_pressure_fl_bar: { type: Number, default: 0 },
    tyre_pressure_fr_bar: { type: Number, default: 0 },
    tyre_pressure_rl_bar: { type: Number, default: 0 },
    tyre_pressure_rr_bar: { type: Number, default: 0 },
    brake_health_percent: { type: Number, default: 0 },
    brake_pad_percent: { type: Number, default: 0 },
    suspension_health_percent: { type: Number, default: 0 },

    // —— Electrical / diagnostics ——
    aux_12v_volt: { type: Number, default: 0 },
    fault_codes_count: { type: Number, default: 0 },
    active_warnings: { type: [String], default: [] },
    software_version: { type: String, default: "" },

    // —— Service & mileage ——
    odometer_km: { type: Number, default: 0 },
    last_service_at: { type: Date, default: null },
    next_service_due_km: { type: Number, default: 0 },
    last_diagnosis_at: { type: Date, default: null },
    inspection_passed: { type: Boolean, default: null },
  },
  { _id: false },
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

    health: { type: healthSchema, default: () => ({}) },

    updates: { type: [garageUpdateSchema], default: [] },
    last_synced_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const GarageVehicle = mongoose.model("GarageVehicle", garageVehicleSchema);
