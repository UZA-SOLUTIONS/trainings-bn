/**
 * Wallet preview for banks & track views.
 * Live MoMo ledger is not wired yet — this projects what the bank will see
 * once `/api/wallet/*` goes live, using training + financing fields already on the candidate.
 *
 * Operating rules (UZA Mobility OS):
 * - Amounts are whole RWF; MoMo is the rail.
 * - Cab take: driver 92% / UZA 8%.
 * - Bank must always see a full 10% deposit; UZA Access fills the gap.
 * - Selling price S stays 22,500,000; total = (S − contribution) / 0.9 when Access is used.
 * - loan principal + driver contribution = S (always).
 */

export const UZA_SELLING_PRICE_RWF = 22_500_000;
export const BANK_DEPOSIT_PERCENT = 0.1;
export const MIN_DRIVER_CONTRIBUTION_RWF = 500_000;
export const DRIVER_FARE_SHARE = 0.92;
export const UZA_COMMISSION_SHARE = 0.08;

/** Planned wallet / money endpoints (not live — marked for implementers & bank UI). */
export const WALLET_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/wallet/:uzaId",
    audience: ["driver", "bank", "staff"],
    purpose: "Wallet balance, locked savings sub-wallet, commission owed, available-to-keep",
  },
  {
    method: "GET",
    path: "/api/wallet/:uzaId/ledger",
    audience: ["driver", "bank", "staff"],
    purpose: "Immutable money movements: who, what, before, after, when",
  },
  {
    method: "GET",
    path: "/api/wallet/:uzaId/daily",
    audience: ["driver", "staff"],
    purpose: "Gross earned today − commission − owner − loan − savings = yours to keep",
  },
  {
    method: "GET",
    path: "/api/wallet/:uzaId/savings",
    audience: ["driver", "bank", "staff"],
    purpose: "Locked savings pot, streak, and auto loan-instalment draw",
  },
  {
    method: "GET",
    path: "/api/wallet/:uzaId/loan",
    audience: ["driver", "bank", "staff"],
    purpose: "Days ahead / behind on loan, repayment schedule, arrears",
  },
  {
    method: "POST",
    path: "/api/wallet/:uzaId/topups",
    audience: ["driver"],
    purpose: "MoMo top-up (sandbox-ready; live credentials still to switch on)",
  },
  {
    method: "POST",
    path: "/api/wallet/:uzaId/payouts",
    audience: ["driver", "staff"],
    purpose: "Confirmed MoMo payouts only — never on SMS or screenshot",
  },
  {
    method: "GET",
    path: "/api/bank/applicants/:uzaId/wallet-risk",
    audience: ["bank", "staff"],
    purpose: "Risk snapshot from wallet behaviour for the consented bank only",
  },
  {
    method: "GET",
    path: "/api/bank/portfolio/wallet",
    audience: ["bank", "staff"],
    purpose: "Portfolio: outstanding, arrears, portfolio-at-risk from wallet repayments",
  },
  {
    method: "GET",
    path: "/api/trust/:uzaId",
    audience: ["driver", "bank", "staff"],
    purpose: "Trust score 300–850 (repayments, savings streak, trips, rating)",
  },
  {
    method: "GET",
    path: "/api/reconciliation/runs",
    audience: ["staff"],
    purpose: "Daily money reconciliation: expired top-ups, reversed payouts, ledger drift",
  },
];

function wholeRwf(n) {
  if (n == null || !Number.isFinite(Number(n))) return 0;
  return Math.round(Number(n));
}

/**
 * Financing math the bank must always see (OS §6).
 * @param {object} candidate
 */
export function buildFinancingStructure(candidate) {
  const sellingPrice = UZA_SELLING_PRICE_RWF;
  const contribution = wholeRwf(candidate.deposit_available_rwf);
  const bankDepositRequired = wholeRwf(sellingPrice * BANK_DEPOSIT_PERCENT);
  const uzaAccessGap = Math.max(0, bankDepositRequired - contribution);
  const usesAccess =
    Boolean(candidate.needs_uza_access_support) || uzaAccessGap > 0;

  // When Access fronts the gap: total package = (S − contribution) / 0.9
  const packageTotal = usesAccess
    ? wholeRwf((sellingPrice - contribution) / (1 - BANK_DEPOSIT_PERCENT))
    : sellingPrice;

  const loanPrincipal = Math.max(0, sellingPrice - contribution);
  const identityCheck = loanPrincipal + contribution;

  return {
    selling_price_rwf: sellingPrice,
    target_vehicle_name: candidate.target_vehicle_name || null,
    driver_contribution_rwf: contribution,
    bank_deposit_required_rwf: bankDepositRequired,
    bank_deposit_percent: BANK_DEPOSIT_PERCENT,
    min_driver_contribution_rwf: MIN_DRIVER_CONTRIBUTION_RWF,
    uza_access_gap_rwf: uzaAccessGap,
    uza_access_active: usesAccess && uzaAccessGap > 0,
    package_total_rwf: packageTotal,
    loan_principal_rwf: loanPrincipal,
    identity_holds: identityCheck === sellingPrice,
    term_months: (candidate.preferred_term_years || 4) * 12,
    collateral_release_month: 24,
    note:
      "Bank always sees a full 10% deposit. UZA Access fills any shortfall and is recovered in the package total. Loan principal + contribution = selling price.",
  };
}

/**
 * Projected daily take for bank risk context (OS §3–4).
 * Not live trip data — uses declared average daily earnings until Move ledger is on.
 */
function buildDailyProjection(candidate) {
  const gross = wholeRwf(candidate.average_daily_earnings_rwf);
  const uzaCommission = wholeRwf(gross * UZA_COMMISSION_SHARE);
  const driverShare = wholeRwf(gross * DRIVER_FARE_SHARE);
  // Owner / loan / savings not live yet — show as planned buckets
  return {
    source: gross > 0 ? "declared_earnings" : "awaiting_trips",
    live: false,
    gross_rwf: gross,
    uza_commission_rwf: uzaCommission,
    driver_fare_share_rwf: driverShare,
    vehicle_owner_due_rwf: null,
    loan_instalment_rwf: null,
    savings_rwf: null,
    yours_to_keep_rwf: null,
    split: {
      driver_percent: DRIVER_FARE_SHARE * 100,
      uza_percent: UZA_COMMISSION_SHARE * 100,
    },
    endpoint: "GET /api/wallet/:uzaId/daily",
  };
}

/**
 * @param {object} candidate lean Candidate
 * @param {{ audience?: "driver" | "bank" | "staff" }} [opts]
 */
export function buildWalletPreview(candidate, opts = {}) {
  const audience = opts.audience || "bank";
  const financing = buildFinancingStructure(candidate);
  const daily = buildDailyProjection(candidate);

  const trainingComplete = candidate.training_status === "completed";
  const depositReady =
    financing.driver_contribution_rwf >= financing.min_driver_contribution_rwf;

  // App / MoMo identifiers — live numbers arrive once wallet onboarding is on.
  // Until then track & bank UIs show explicit zeros so the fields are already contracted.
  const appNumbers = {
    momo: candidate.wallet_momo_number || "0",
    airtel: candidate.wallet_airtel_number || "0",
    uza_wallet: candidate.wallet_account_number || "0",
    linked_phone: candidate.phone || "0",
  };

  return {
    status: "planned",
    live: false,
    message: "",
    uza_id: candidate.candidate_code,
    audience,
    app_numbers: appNumbers,
    balances: {
      available_rwf: 0,
      savings_locked_rwf: 0,
      commission_owed_rwf: 0,
      currency: "RWF",
      endpoint: "GET /api/wallet/:uzaId",
    },
    daily,
    savings: {
      live: false,
      mode: null,
      streak_days: 0,
      pot_rwf: 0,
      pays_loan_instalment: true,
      endpoint: "GET /api/wallet/:uzaId/savings",
    },
    loan: {
      live: false,
      days_ahead: null,
      days_behind: null,
      principal_rwf: financing.loan_principal_rwf,
      term_months: financing.term_months,
      endpoint: "GET /api/wallet/:uzaId/loan",
    },
    financing,
    bank_signals: {
      sees_full_ten_percent_deposit: true,
      deposit_cover_percent: financing.bank_deposit_required_rwf
        ? Math.min(
            100,
            Math.round(
              (financing.driver_contribution_rwf / financing.bank_deposit_required_rwf) * 100,
            ),
          )
        : 0,
      min_contribution_met: depositReady,
      training_stands_in_for_equity: trainingComplete,
      repayment_rail: "MTN MoMo / Airtel — confirmed network only",
      trust_score: null,
      trust_endpoint: "GET /api/trust/:uzaId",
      risk_endpoint: "GET /api/bank/applicants/:uzaId/wallet-risk",
    },
    endpoints: WALLET_ENDPOINTS.filter((e) => e.audience.includes(audience)),
  };
}
