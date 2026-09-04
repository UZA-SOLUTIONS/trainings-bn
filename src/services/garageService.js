import { GarageVehicle } from "../models/GarageVehicle.js";
import { Candidate } from "../models/Candidate.js";
import { AppError } from "../utils/errors.js";

const CANDIDATE_CODE_RE = /^UZA-\d{4}-\d{5}$/i;
const MAX_UPDATES_STORED = 40;

const HEALTH_STATUS = ["unknown", "healthy", "attention", "critical", "in_service"];
const CHARGING_STATUS = ["unknown", "idle", "charging", "full", "fault"];

export const GARAGE_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/garage/:uzaId",
    audience: ["driver", "bank", "staff", "garage"],
    purpose: "Full vehicle diagnosis + recent garage updates for track / banks",
  },
  {
    method: "POST",
    path: "/api/garage/:uzaId/updates",
    audience: ["garage", "staff"],
    purpose:
      "Ingest full EV diagnosis (battery, powertrain, chassis, electrical, service) from the garage",
  },
];

function normalizeCode(uzaId) {
  const code = String(uzaId || "").trim().toUpperCase();
  if (!CANDIDATE_CODE_RE.test(code)) {
    throw new AppError("Invalid UZA ID", 400, "INVALID_CODE");
  }
  return code;
}

function whole(n, fallback = 0) {
  if (n == null || !Number.isFinite(Number(n))) return fallback;
  return Math.round(Number(n));
}

function clampPercent(n) {
  return Math.max(0, Math.min(100, whole(n)));
}

function decimal(n, fallback = 0, digits = 1) {
  if (n == null || !Number.isFinite(Number(n))) return fallback;
  const f = 10 ** digits;
  return Math.round(Number(n) * f) / f;
}

function isoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function emptyHealth() {
  return {
    overall_score: 0,
    status: "unknown",
    battery_percent: 0,
    battery_soh_percent: 0,
    battery_temp_c: 0,
    battery_cell_diff_mv: 0,
    charge_cycles: 0,
    charging_status: "unknown",
    range_km: 0,
    motor_health_percent: 0,
    inverter_health_percent: 0,
    coolant_temp_c: 0,
    tyre_health_percent: 0,
    tyre_pressure_fl_bar: 0,
    tyre_pressure_fr_bar: 0,
    tyre_pressure_rl_bar: 0,
    tyre_pressure_rr_bar: 0,
    brake_health_percent: 0,
    brake_pad_percent: 0,
    suspension_health_percent: 0,
    aux_12v_volt: 0,
    fault_codes_count: 0,
    active_warnings: [],
    software_version: "",
    odometer_km: 0,
    last_service_at: null,
    next_service_due_km: 0,
    last_diagnosis_at: null,
    inspection_passed: null,
  };
}

/**
 * Normalize stored / incoming health into the public diagnosis shape.
 */
export function normalizeHealth(raw = {}) {
  const h = raw && typeof raw === "object" ? raw : {};
  const base = emptyHealth();

  return {
    ...base,
    overall_score: clampPercent(h.overall_score ?? base.overall_score),
    status: HEALTH_STATUS.includes(String(h.status)) ? String(h.status) : "unknown",

    battery_percent: clampPercent(h.battery_percent ?? h.soc_percent ?? base.battery_percent),
    battery_soh_percent: clampPercent(h.battery_soh_percent ?? h.soh_percent ?? base.battery_soh_percent),
    battery_temp_c: decimal(h.battery_temp_c ?? base.battery_temp_c),
    battery_cell_diff_mv: whole(h.battery_cell_diff_mv ?? base.battery_cell_diff_mv),
    charge_cycles: whole(h.charge_cycles ?? base.charge_cycles),
    charging_status: CHARGING_STATUS.includes(String(h.charging_status))
      ? String(h.charging_status)
      : "unknown",
    range_km: whole(h.range_km ?? base.range_km),

    motor_health_percent: clampPercent(h.motor_health_percent ?? base.motor_health_percent),
    inverter_health_percent: clampPercent(h.inverter_health_percent ?? base.inverter_health_percent),
    coolant_temp_c: decimal(h.coolant_temp_c ?? base.coolant_temp_c),

    tyre_health_percent: clampPercent(h.tyre_health_percent ?? base.tyre_health_percent),
    tyre_pressure_fl_bar: decimal(h.tyre_pressure_fl_bar ?? h.tyre_pressure?.fl ?? base.tyre_pressure_fl_bar),
    tyre_pressure_fr_bar: decimal(h.tyre_pressure_fr_bar ?? h.tyre_pressure?.fr ?? base.tyre_pressure_fr_bar),
    tyre_pressure_rl_bar: decimal(h.tyre_pressure_rl_bar ?? h.tyre_pressure?.rl ?? base.tyre_pressure_rl_bar),
    tyre_pressure_rr_bar: decimal(h.tyre_pressure_rr_bar ?? h.tyre_pressure?.rr ?? base.tyre_pressure_rr_bar),
    brake_health_percent: clampPercent(h.brake_health_percent ?? base.brake_health_percent),
    brake_pad_percent: clampPercent(h.brake_pad_percent ?? base.brake_pad_percent),
    suspension_health_percent: clampPercent(
      h.suspension_health_percent ?? base.suspension_health_percent,
    ),

    aux_12v_volt: decimal(h.aux_12v_volt ?? base.aux_12v_volt, 0, 2),
    fault_codes_count: whole(h.fault_codes_count ?? base.fault_codes_count),
    active_warnings: Array.isArray(h.active_warnings)
      ? h.active_warnings.map((w) => String(w).slice(0, 120)).filter(Boolean).slice(0, 20)
      : [],
    software_version: String(h.software_version || "").slice(0, 80),

    odometer_km: whole(h.odometer_km ?? base.odometer_km),
    last_service_at: isoOrNull(h.last_service_at),
    next_service_due_km: whole(h.next_service_due_km ?? base.next_service_due_km),
    last_diagnosis_at: isoOrNull(h.last_diagnosis_at),
    inspection_passed:
      h.inspection_passed == null ? null : Boolean(h.inspection_passed),
  };
}

function applyHealthPatch(record, patch) {
  if (!patch || typeof patch !== "object") return;
  const h = record.health;

  const setPct = (key, aliases = []) => {
    for (const k of [key, ...aliases]) {
      if (patch[k] != null) {
        h[key] = clampPercent(patch[k]);
        return;
      }
    }
  };
  const setWhole = (key, aliases = []) => {
    for (const k of [key, ...aliases]) {
      if (patch[k] != null) {
        h[key] = whole(patch[k]);
        return;
      }
    }
  };
  const setDec = (key, digits = 1, aliases = []) => {
    for (const k of [key, ...aliases]) {
      if (patch[k] != null) {
        h[key] = decimal(patch[k], 0, digits);
        return;
      }
    }
  };

  setPct("overall_score");
  setPct("battery_percent", ["soc_percent"]);
  setPct("battery_soh_percent", ["soh_percent"]);
  setDec("battery_temp_c");
  setWhole("battery_cell_diff_mv");
  setWhole("charge_cycles");
  setWhole("range_km");
  setPct("motor_health_percent");
  setPct("inverter_health_percent");
  setDec("coolant_temp_c");
  setPct("tyre_health_percent");
  setDec("tyre_pressure_fl_bar");
  setDec("tyre_pressure_fr_bar");
  setDec("tyre_pressure_rl_bar");
  setDec("tyre_pressure_rr_bar");
  setPct("brake_health_percent");
  setPct("brake_pad_percent");
  setPct("suspension_health_percent");
  setDec("aux_12v_volt", 2);
  setWhole("fault_codes_count");
  setWhole("odometer_km");
  setWhole("next_service_due_km");

  if (patch.tyre_pressure && typeof patch.tyre_pressure === "object") {
    const tp = patch.tyre_pressure;
    if (tp.fl != null) h.tyre_pressure_fl_bar = decimal(tp.fl);
    if (tp.fr != null) h.tyre_pressure_fr_bar = decimal(tp.fr);
    if (tp.rl != null) h.tyre_pressure_rl_bar = decimal(tp.rl);
    if (tp.rr != null) h.tyre_pressure_rr_bar = decimal(tp.rr);
  }

  if (patch.charging_status != null && CHARGING_STATUS.includes(String(patch.charging_status))) {
    h.charging_status = String(patch.charging_status);
  }
  if (patch.status != null && HEALTH_STATUS.includes(String(patch.status))) {
    h.status = String(patch.status);
  }
  if (patch.software_version != null) {
    h.software_version = String(patch.software_version).slice(0, 80);
  }
  if (Array.isArray(patch.active_warnings)) {
    h.active_warnings = patch.active_warnings
      .map((w) => String(w).slice(0, 120))
      .filter(Boolean)
      .slice(0, 20);
  }
  if (patch.inspection_passed != null) {
    h.inspection_passed = Boolean(patch.inspection_passed);
  }
  if (patch.last_service_at != null) {
    const d = new Date(patch.last_service_at);
    if (!Number.isNaN(d.getTime())) h.last_service_at = d;
  }
  if (patch.last_diagnosis_at != null) {
    const d = new Date(patch.last_diagnosis_at);
    if (!Number.isNaN(d.getTime())) h.last_diagnosis_at = d;
  } else if (
    patch.battery_soh_percent != null ||
    patch.fault_codes_count != null ||
    patch.overall_score != null
  ) {
    h.last_diagnosis_at = new Date();
  }
}

/**
 * Track / bank facing snapshot. Always returns full diagnosis shape (zeros until garage syncs).
 */
export function buildGaragePreview(candidate, record) {
  const code = candidate?.candidate_code || record?.candidate_code || null;
  const hasLive = Boolean(record?.last_synced_at);
  const updates = Array.isArray(record?.updates) ? record.updates : [];

  return {
    status: hasLive ? "connected" : "awaiting_garage",
    live: hasLive,
    message: hasLive
      ? "Latest full vehicle diagnosis from the garage."
      : "Garage should post a full diagnosis: battery SOH, motor, brakes, tyres, faults, and service data. Numbers stay at 0 until the first sync.",
    uza_id: code,
    vehicle: {
      plate: record?.plate || candidate?.current_vehicle_plate || "",
      vin: record?.vin || "",
      model: record?.model || candidate?.target_vehicle_name || "",
      garage_id: record?.garage_id || "",
      garage_name: record?.garage_name || "",
    },
    health: normalizeHealth(record?.health),
    updates: updates
      .slice()
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 12)
      .map((u) => ({
        id: String(u._id || ""),
        at: u.at ? new Date(u.at).toISOString() : null,
        type: u.type || "other",
        title: u.title,
        detail: u.detail || "",
        severity: u.severity || "info",
        source: u.source || "garage",
      })),
    last_synced_at: record?.last_synced_at
      ? new Date(record.last_synced_at).toISOString()
      : null,
    endpoints: GARAGE_ENDPOINTS,
  };
}

export async function getGarageForCandidate(candidate) {
  if (!candidate?.candidate_code) {
    return buildGaragePreview(candidate, null);
  }
  const record = await GarageVehicle.findOne({
    candidate_code: candidate.candidate_code,
  }).lean();
  return buildGaragePreview(candidate, record);
}

/**
 * Ingest full diagnosis + optional event from garage systems.
 */
export async function ingestGarageUpdate(uzaId, body = {}) {
  const code = normalizeCode(uzaId);
  const candidate = await Candidate.findOne({ candidate_code: code }).lean();
  if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");

  let record = await GarageVehicle.findOne({ candidate_code: code });
  if (!record) {
    record = new GarageVehicle({
      candidate_code: code,
      candidate_id: candidate._id,
      plate: candidate.current_vehicle_plate || "",
      model: candidate.target_vehicle_name || "",
    });
  }

  if (body.plate != null) record.plate = String(body.plate).trim();
  if (body.vin != null) record.vin = String(body.vin).trim();
  if (body.model != null) record.model = String(body.model).trim();
  if (body.garage_id != null) record.garage_id = String(body.garage_id).trim();
  if (body.garage_name != null) record.garage_name = String(body.garage_name).trim();

  const h = body.health && typeof body.health === "object" ? body.health : body;
  applyHealthPatch(record, h);

  const event = body.update || body.event || null;
  if (event && typeof event === "object" && event.title) {
    record.updates.unshift({
      at: event.at ? new Date(event.at) : new Date(),
      type: event.type || "diagnosis",
      title: String(event.title).slice(0, 200),
      detail: String(event.detail || "").slice(0, 2000),
      severity: ["info", "watch", "critical"].includes(event.severity)
        ? event.severity
        : "info",
      source: String(event.source || body.source || "garage").slice(0, 80),
    });
    if (record.updates.length > MAX_UPDATES_STORED) {
      record.updates = record.updates.slice(0, MAX_UPDATES_STORED);
    }
  }

  record.last_synced_at = new Date();
  await record.save();

  return buildGaragePreview(candidate, record.toObject());
}

export async function getGarageByCode(uzaId) {
  const code = normalizeCode(uzaId);
  const candidate = await Candidate.findOne({ candidate_code: code }).lean();
  if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");
  return getGarageForCandidate(candidate);
}
