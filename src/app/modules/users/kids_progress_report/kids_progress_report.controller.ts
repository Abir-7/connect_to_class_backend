/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";
import { get_relative_path } from "../../../middleware/fileUpload/multer_file_storage/get_relative_path";
import AppError from "../../../errors/AppError";
import unlink_file from "../../../middleware/fileUpload/multer_file_storage/unlink_files";
import { KidsProgressReportService } from "./kids_progress_report.service";

const addReport = catch_async(async (req, res) => {
  const files = req.files as Express.Multer.File[];

  const filePaths = Array.isArray(files)
    ? files.map((file: { path: any }) => get_relative_path(file.path))
    : [];
  const other_data = {
    ...req.body,
  };

  files?.forEach((file) => {
    if (!file.mimetype.startsWith("image/")) {
      filePaths.forEach((file_path) => unlink_file(file_path));
      throw new AppError(500, "Only image file supported.");
    }
  });

  const result = await KidsProgressReportService.addReport(
    req.params.kids_id,
    other_data,
    filePaths
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Kids profile updated.",
    data: result,
  });
});

const removeReport = catch_async(async (req, res) => {
  const result = await KidsProgressReportService.removeReport(
    req.params.kids_id,
    req.body.report_id
  );
  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Kids report removed.",
    data: result,
  });
});

const getKidsReport = catch_async(async (req, res) => {
  const result = await KidsProgressReportService.getKidsReport(
    req.params.kids_id
  );
  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Kids report fetched.",
    data: result,
  });
});

export const KidsProgressReportController = {
  addReport,
  removeReport,
  getKidsReport,
};
