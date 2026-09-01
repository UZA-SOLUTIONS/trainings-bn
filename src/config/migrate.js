import { Cohort } from "../models/Cohort.js";
import { FinancingInstitution } from "../models/FinancingInstitution.js";

/** Links cohorts to institutions by matching partner_bank name. Safe to run repeatedly. */
export async function migrateInstitutionLinks() {
  const institutions = await FinancingInstitution.find().lean();
  const byName = new Map(institutions.map((i) => [i.name.toLowerCase(), i._id]));

  const cohorts = await Cohort.find({ institution_id: null, partner_bank: { $ne: null } }).lean();
  let linked = 0;

  for (const cohort of cohorts) {
    const institutionId = byName.get(String(cohort.partner_bank).toLowerCase());
    if (institutionId) {
      await Cohort.updateOne({ _id: cohort._id }, { institution_id: institutionId });
      linked += 1;
    }
  }

  if (linked > 0) {
    console.log(`Linked ${linked} cohort(s) to financing institutions`);
  }
}
