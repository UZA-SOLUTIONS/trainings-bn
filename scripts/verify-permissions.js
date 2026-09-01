import {
  filterCandidatePatch,
  isAdmin,
  isBankPartner,
  isInstructor,
} from "../src/utils/permissions.js";
import { AppError } from "../src/utils/errors.js";

const admin = { role: "admin" };
const instructor = { role: "instructor" };
const bankPartner = { role: "bank_partner", institution_id: "507f1f77bcf86cd799439011" };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Admin gets full patch
const adminPatch = filterCandidatePatch(admin, {
  status: "enrolled",
  doc_national_id: true,
  loan_review_status: "approved",
});
assert(adminPatch.status === "enrolled", "admin status");
assert(adminPatch.doc_national_id === true, "admin docs");
assert(adminPatch.loan_review_status === "approved", "admin loan");

// Instructor training only
const instructorPatch = filterCandidatePatch(instructor, {
  training_status: "completed",
  doc_national_id: true,
});
assert(instructorPatch.training_status === "completed", "instructor training");
assert(instructorPatch.doc_national_id === undefined, "instructor no docs");

// Bank partner docs and loan
const bankPatch = filterCandidatePatch(bankPartner, {
  doc_national_id: true,
  loan_review_status: "in_review",
  training_status: "completed",
});
assert(bankPatch.doc_national_id === true, "bank docs");
assert(bankPatch.loan_review_status === "in_review", "bank loan");
assert(bankPatch.training_status === undefined, "bank no training");

// Instructor reject requires reason
let rejected = false;
try {
  filterCandidatePatch(instructor, { status: "rejected" });
} catch (err) {
  rejected = err instanceof AppError && err.code === "VALIDATION_ERROR";
}
assert(rejected, "instructor reject requires reason");

assert(isAdmin(admin), "isAdmin");
assert(isInstructor(instructor), "isInstructor");
assert(isBankPartner(bankPartner), "isBankPartner");

console.log("Permission matrix checks passed.");
