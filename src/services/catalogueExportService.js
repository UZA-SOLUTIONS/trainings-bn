import { Course } from "../models/Course.js";
import { TrainingModule } from "../models/TrainingModule.js";
import { Cohort } from "../models/Cohort.js";
import { Candidate } from "../models/Candidate.js";
import { toJSON } from "../utils/serialize.js";

function serializeAttachment(att) {
  return {
    name: att.name,
    mime_type: att.mime_type,
    size: att.size,
    data: att.data || null,
  };
}

function serializeModule(doc) {
  const json = toJSON(doc);
  return {
    name: json.name,
    code: json.code,
    description: json.description ?? null,
    content: json.content ?? null,
    contents: [...(doc.contents || [])]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((section, index) => ({
        title: section.title,
        body: section.body || "",
        sort_order: section.sort_order ?? index + 1,
      })),
    attachments: (doc.attachments || []).map(serializeAttachment),
    sort_order: json.sort_order,
    duration_hours: json.duration_hours,
    status: json.status,
  };
}

function serializeCourse(doc) {
  const json = toJSON(doc);
  return {
    name: json.name,
    code: json.code,
    description: json.description ?? null,
    duration_weeks: json.duration_weeks,
    status: json.status,
  };
}

function identityRoster(doc) {
  const json = toJSON(doc);
  return {
    candidate_code: json.candidate_code,
    full_name: json.full_name,
    national_id: json.national_id,
    phone: json.phone,
    gender: json.gender ?? null,
    district: json.district ?? null,
    date_of_birth: json.date_of_birth ?? null,
    email: json.email ?? null,
    status: json.status,
  };
}

export async function exportPublishedCatalogue() {
  const courses = await Course.find({ status: "active" }).sort({ name: 1 });
  const courseIds = courses.map((c) => c._id);
  const modules = await TrainingModule.find({
    course_id: { $in: courseIds },
    status: { $in: ["active", "draft"] },
  }).sort({ sort_order: 1, name: 1 });

  const modulesByCourse = new Map();
  for (const mod of modules) {
    const key = String(mod.course_id);
    if (!modulesByCourse.has(key)) modulesByCourse.set(key, []);
    modulesByCourse.get(key).push(serializeModule(mod));
  }

  const packagedCourses = courses.map((course) => ({
    ...serializeCourse(course),
    modules: modulesByCourse.get(String(course._id)) ?? [],
  }));

  const intakes = await Cohort.find({ kind: "institution" })
    .populate({ path: "course_id", select: "code name status" })
    .sort({ start_date: 1, name: 1 });

  const intakeIds = intakes.map((c) => c._id);
  const candidates = intakeIds.length
    ? await Candidate.find({
        cohort_id: { $in: intakeIds },
        status: { $in: ["enrolled", "waitlisted", "graduated"] },
      }).sort({ created_at: 1 })
    : [];

  const rosterByCohort = new Map();
  for (const row of candidates) {
    const key = String(row.cohort_id);
    if (!rosterByCohort.has(key)) rosterByCohort.set(key, []);
    rosterByCohort.get(key).push(identityRoster(row));
  }

  const packagedIntakes = intakes.map((cohort) => {
    const course = cohort.course_id;
    const courseCode =
      course && typeof course === "object" && course.code ? course.code : null;
    return {
      name: cohort.name,
      code: cohort.code,
      capacity: cohort.capacity,
      location: cohort.location ?? null,
      start_date: cohort.start_date ?? null,
      end_date: cohort.end_date ?? null,
      notes: cohort.notes ?? null,
      course_code: courseCode,
      target_school_code: cohort.target_school_code || null,
      roster: rosterByCohort.get(String(cohort._id)) ?? [],
    };
  });

  return { courses: packagedCourses, intakes: packagedIntakes };
}
