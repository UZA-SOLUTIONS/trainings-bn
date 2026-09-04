import { GarageVehicle } from "../models/GarageVehicle.js";
import { Candidate } from "../models/Candidate.js";
import { AppError } from "../utils/errors.js";

const CANDIDATE_CODE_RE = /^UZA-\d{4}-\d{5}$/i;
const MAX_UPDATES_STORED = 40;

export const GARAGE_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/garage/:uzaId",
    audience: ["driver", "bank", "staff", "garage"],
    purpose: "Vehicle health snapshot + recent garage updates for track / banks",
  },
  {
    method: "POST",
    path: "/api/garage/:uzaId/updates",
    audience: ["garage", "staff"],
    purpose: "Ingest car health metrics and service updates from the garage",
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

/**
 * Track / bank facing snapshot. Always returns a shape (zeros when no garage data yet).
 */
export function buildGaragePreview(candidate, record) {
  const code = candidate?.candidate_code || record?.candidate_code || null;
  const hasLive = Boolean(record?.last_synced_at);

  const health = record?.health || {};
  const updates = Array.isArray(record?.updates) ? record.updates : [];

  return {
    status: hasLive ? "connected" : "awaiting_garage",
    live: hasLive,
    message: hasLive
      ? "Latest vehicle health from the garage."
      : "Garage link is ready. Car health and updates will appear here once the garage posts telemetry.",
    uza_id: code,
    vehicle: {
      plate: record?.plate || candidate?.current_vehicle_plate || "",
      vin: record?.vin || "",
      model: record?.model || candidate?.target_vehicle_name || "",
      garage_id: record?.garage_id || "",
      garage_name: record?.garage_name || "",
    },
    health: {
      overall_score: whole(health.overall_score),
      battery_percent: clampPercent(health.battery_percent),
      range_km: whole(health.range_km),
      odometer_km: whole(health.odometer_km),
      tyre_health_percent: clampPercent(health.tyre_health_percent),
      last_service_at: health.last_service_at
        ? new Date(health.last_service_at).toISOString()
        : null,
      next_service_due_km: whole(health.next_service_due_km),
      status: health.status || "unknown",
    },
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
 * Ingest health + optional event from garage systems.
 * Body may include health fields and/or a single `update` event.
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
  if (h.overall_score != null) record.health.overall_score = clampPercent(h.overall_score);
  if (h.battery_percent != null) record.health.battery_percent = clampPercent(h.battery_percent);
  if (h.range_km != null) record.health.range_km = whole(h.range_km);
  if (h.odometer_km != null) record.health.odometer_km = whole(h.odometer_km);
  if (h.tyre_health_percent != null) {
    record.health.tyre_health_percent = clampPercent(h.tyre_health_percent);
  }
  if (h.next_service_due_km != null) {
    record.health.next_service_due_km = whole(h.next_service_due_km);
  }
  if (h.last_service_at != null) {
    const d = new Date(h.last_service_at);
    if (!Number.isNaN(d.getTime())) record.health.last_service_at = d;
  }
  if (h.status != null) {
    const allowed = ["unknown", "healthy", "attention", "critical", "in_service"];
    if (allowed.includes(String(h.status))) record.health.status = String(h.status);
  }

  const event = body.update || body.event || null;
  if (event && typeof event === "object" && event.title) {
    record.updates.unshift({
      at: event.at ? new Date(event.at) : new Date(),
      type: event.type || "other",
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
