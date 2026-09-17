import * as reportService from "../services/reportService.js";
import { success } from "../utils/response.js";
import { sendCsv } from "../utils/csv.js";
import { asyncHandler } from "../utils/errors.js";

export const attendance = asyncHandler(async (req, res) => {
  const data = await reportService.attendanceReport(req.user, req.params.id, req.query);
  if (req.query.format === "csv") {
    return sendCsv(
      res,
      `attendance-${data.cohort.code}.csv`,
      reportService.attendanceReportCsv(data),
    );
  }
  return success(res, data, "Attendance report retrieved successfully");
});

export const scores = asyncHandler(async (req, res) => {
  const data = await reportService.scoresReport(req.user, req.params.id);
  if (req.query.format === "csv") {
    return sendCsv(res, `scores-${data.cohort.code}.csv`, reportService.scoresReportCsv(data));
  }
  return success(res, data, "Scores report retrieved successfully");
});

export const issues = asyncHandler(async (req, res) => {
  const data = await reportService.issuesReport(req.user, req.params.id, req.query);
  if (req.query.format === "csv") {
    return sendCsv(res, `issues-${data.cohort.code}.csv`, reportService.issuesReportCsv(data));
  }
  return success(res, data, "Issues report retrieved successfully");
});
