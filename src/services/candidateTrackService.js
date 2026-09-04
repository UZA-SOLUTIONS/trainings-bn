import { buildWalletPreview } from "./walletPreviewService.js";
import { getGarageForCandidate } from "./garageService.js";

/** Public driver-facing document checklist (matches frontend bank-requirements). */
export const TRACK_DOCUMENTS = [
  { key: "doc_national_id", label: "National ID", conditional: null },
  { key: "doc_spouse_id", label: "Spouse's national ID", conditional: "married" },
  { key: "doc_loan_application_letter", label: "Loan application letter", conditional: null },
  { key: "doc_tax_clearance", label: "Tax clearance certificate", conditional: null },
  { key: "doc_marital_status_proof", label: "Proof of marital status", conditional: null },
  {
    key: "doc_proforma_invoice",
    label: "Proforma invoice (vehicle quotation)",
    conditional: "optional_later",
  },
  { key: "doc_deposit_proof", label: "Proof of deposit or collateral", conditional: null },
  { key: "doc_momo_statement", label: "MoMo transaction history (12 months)", conditional: null },
  { key: "doc_yego_history", label: "Yego Cabs history (12 months)", conditional: null },
  {
    key: "doc_cooperative_letter",
    label: "Cooperative president's letter",
    conditional: "cooperative",
  },
  { key: "doc_driving_license", label: "Driving licence", conditional: null },
  {
    key: "doc_previous_vehicle_docs",
    label: "Previous vehicle documents",
    conditional: "previous_service",
  },
  { key: "doc_two_passport_photos", label: "Two passport-size photos", conditional: null },
];

function depositRequired(priceRwf) {
  if (!priceRwf || priceRwf <= 0) return null;
  const percent = priceRwf <= 25_000_000 ? 0.1 : 0.15;
  return { percent, amount: Math.round(priceRwf * percent) };
}

function docApplies(doc, candidate) {
  if (doc.conditional === "married") {
    return String(candidate.marital_status || "").toLowerCase().includes("married");
  }
  if (doc.conditional === "cooperative") return Boolean(candidate.is_cooperative_member);
  if (doc.conditional === "previous_service") return Boolean(candidate.previously_drove_for_service);
  return true;
}

function buildDocuments(candidate) {
  return TRACK_DOCUMENTS.filter((doc) => docApplies(doc, candidate)).map((doc) => ({
    key: doc.key,
    label: doc.label,
    required: doc.conditional !== "optional_later",
    optional_later: doc.conditional === "optional_later",
    complete: Boolean(candidate[doc.key]),
  }));
}

function milestoneStatus(id, candidate, docs) {
  const requiredDocs = docs.filter((d) => d.required);
  const docsComplete = requiredDocs.length > 0 && requiredDocs.every((d) => d.complete);
  const docsPartial = requiredDocs.some((d) => d.complete);

  switch (id) {
    case "application":
      return "complete";
    case "cohort":
      if (candidate.status === "rejected" || candidate.status === "withdrawn") return "blocked";
      if (candidate.status === "waitlisted") return "pending";
      if (candidate.status === "enrolled" || candidate.status === "graduated") return "complete";
      return "pending";
    case "training":
      if (candidate.training_status === "completed") return "complete";
      if (candidate.training_status === "failed") return "blocked";
      if (candidate.training_status === "in_progress") return "in_progress";
      return "pending";
    case "documents":
      if (docsComplete) return "complete";
      if (docsPartial) return "in_progress";
      return "pending";
    case "financing":
      if (candidate.status === "rejected" || candidate.status === "withdrawn") return "blocked";
      if (candidate.listed_on_crb) return "action_required";
      if (candidate.training_status !== "completed") return "pending";
      if (!docsComplete) return "pending";
      if (candidate.status === "graduated") return "complete";
      return "in_review";
    case "allocation":
      return "pending";
    case "shipment":
      return "pending";
    default:
      return "pending";
  }
}

const MILESTONES = [
  { id: "application", label: "Application received" },
  { id: "cohort", label: "Cohort seat confirmed" },
  { id: "training", label: "Training programme" },
  { id: "documents", label: "Bank document file" },
  { id: "financing", label: "Financing & loan review" },
  { id: "allocation", label: "Vehicle allocation" },
  { id: "shipment", label: "Shipment to Kigali" },
];

function buildApprovals(candidate, docs, deposit) {
  const items = [];

  if (candidate.status === "waitlisted") {
    items.push({
      type: "cohort",
      label: "Waiting list",
      status: "pending",
      detail: `You are #${candidate.waitlist_position ?? "—"} on the waiting list. We will notify you when a seat opens.`,
    });
  }

  if (candidate.status === "rejected") {
    items.push({
      type: "cohort",
      label: "Application decision",
      status: "blocked",
      detail: "Your application was not accepted for this cohort. Contact UZA Mobility for guidance.",
    });
  }

  if (candidate.status === "withdrawn") {
    items.push({
      type: "cohort",
      label: "Application withdrawn",
      status: "blocked",
      detail: "This application has been withdrawn.",
    });
  }

  if (candidate.training_status === "not_started" && ["enrolled", "waitlisted"].includes(candidate.status)) {
    items.push({
      type: "training",
      label: "Training not started",
      status: "pending",
      detail: "Attend your cohort training sessions once they begin.",
    });
  }

  if (candidate.training_status === "in_progress") {
    items.push({
      type: "training",
      label: "Training in progress",
      status: "in_progress",
      detail: "Complete training and pass the assessment to move to bank review.",
    });
  }

  if (candidate.training_status === "failed") {
    items.push({
      type: "training",
      label: "Training assessment",
      status: "action_required",
      detail: "Training was not completed successfully. Contact your instructor.",
    });
  }

  const missingDocs = docs.filter((d) => d.required && !d.complete);
  if (missingDocs.length > 0 && !["rejected", "withdrawn"].includes(candidate.status)) {
    items.push({
      type: "documents",
      label: "Documents outstanding",
      status: "action_required",
      detail: `${missingDocs.length} required document${missingDocs.length === 1 ? "" : "s"} still needed for bank review.`,
    });
  }

  if (candidate.listed_on_crb) {
    items.push({
      type: "crb",
      label: "CRB clearance",
      status: "action_required",
      detail:
        candidate.crb_resolution_notes ||
        "Clear your CRB listing before the bank can approve financing.",
    });
  }

  if (candidate.needs_uza_access_support && candidate.status !== "rejected") {
    const gap =
      deposit && candidate.deposit_available_rwf != null
        ? Math.max(0, deposit.amount - Number(candidate.deposit_available_rwf))
        : null;
    items.push({
      type: "uza_access",
      label: "UZA Access deposit top-up",
      status: gap && gap > 0 ? "in_review" : "pending",
      detail:
        gap && gap > 0
          ? `You requested UZA Access support for about ${gap.toLocaleString("en-RW")} RWF toward the required deposit.`
          : "UZA Access top-up was requested — our team will confirm eligibility with the bank.",
    });
  }

  if (
    candidate.has_existing_loan &&
    !candidate.other_loan_repayment_source &&
    candidate.status !== "rejected"
  ) {
    items.push({
      type: "loan",
      label: "Separate loan repayment source",
      status: "action_required",
      detail:
        "Show the bank a repayment source for your existing loan that is separate from this vehicle's earnings.",
    });
  }

  if (deposit && candidate.deposit_available_rwf != null) {
    const shortfall = deposit.amount - Number(candidate.deposit_available_rwf);
    if (shortfall > 0 && !candidate.needs_uza_access_support) {
      items.push({
        type: "deposit",
        label: "Deposit gap",
        status: "action_required",
        detail: `You may need ${Math.round(shortfall).toLocaleString("en-RW")} RWF more toward the ${Math.round(deposit.percent * 100)}% deposit — or apply for UZA Access top-up.`,
      });
    }
  }

  if (
    items.length === 0 &&
    ["enrolled", "graduated"].includes(candidate.status) &&
    candidate.training_status === "completed" &&
    missingDocs.length === 0
  ) {
    items.push({
      type: "financing",
      label: "Bank review",
      status: "in_review",
      detail: "Your file is with the partner bank for financing review. No action needed right now.",
    });
  }

  return items;
}

export async function buildCandidateTrackView(candidate, cohort) {
  const docs = buildDocuments(candidate);
  const requiredDocs = docs.filter((d) => d.required);
  const completeCount = requiredDocs.filter((d) => d.complete).length;
  const deposit = depositRequired(Number(candidate.target_vehicle_price_rwf));

  const milestones = MILESTONES.map((m) => ({
    ...m,
    status: milestoneStatus(m.id, candidate, docs),
  }));

  const currentMilestone =
    milestones.find((m) => m.status === "in_progress" || m.status === "action_required") ||
    milestones.find((m) => m.status === "pending") ||
    milestones[milestones.length - 1];

  return {
    candidate_code: candidate.candidate_code,
    full_name: candidate.full_name,
    status: candidate.status,
    waitlist_position: candidate.waitlist_position,
    applied_at: candidate.applied_at,
    phone: candidate.phone,
    district: candidate.district,
    cohort: cohort
      ? {
          name: cohort.name,
          code: cohort.code,
          location: cohort.location,
          start_date: cohort.start_date,
          partner_bank: cohort.partner_bank,
        }
      : null,
    training: {
      status: candidate.training_status,
      attendance_percentage: candidate.attendance_percentage,
      exam_score: candidate.exam_score,
    },
    documents: docs,
    documents_summary: {
      complete: completeCount,
      required: requiredDocs.length,
      percent:
        requiredDocs.length > 0 ? Math.round((completeCount / requiredDocs.length) * 100) : 0,
    },
    financing: {
      preferred_financing: candidate.preferred_financing,
      preferred_term_years: candidate.preferred_term_years,
      target_vehicle_name: candidate.target_vehicle_name || null,
      target_vehicle_price_rwf: candidate.target_vehicle_price_rwf,
      deposit_available_rwf: candidate.deposit_available_rwf,
      deposit_required_rwf: deposit?.amount ?? null,
      deposit_required_percent: deposit?.percent ?? null,
      needs_uza_access_support: candidate.needs_uza_access_support,
      offers_collateral: candidate.offers_collateral,
      collateral_value_rwf: candidate.collateral_value_rwf,
      has_bank_account: candidate.has_bank_account,
      listed_on_crb: candidate.listed_on_crb,
    },
    milestones,
    current_stage: currentMilestone?.label ?? "Application received",
    approvals: buildApprovals(candidate, docs, deposit),
    wallet: buildWalletPreview(candidate, { audience: "driver" }),
    garage: await getGarageForCandidate(candidate),
  };
}
