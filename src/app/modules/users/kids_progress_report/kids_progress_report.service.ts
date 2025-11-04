/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { uploadFileToCloudinary } from "../../../middleware/fileUpload/cloudinay_file_upload/cloudinaryUpload";
import { deleteFileFromCloudinary } from "../../../middleware/fileUpload/cloudinay_file_upload/deleteFromCloudinary";
import unlink_file from "../../../middleware/fileUpload/multer_file_storage/unlink_files";
import logger from "../../../utils/serverTools/logger";
import { IMediaType } from "../../news_feed/post/post.interface";
import Kids from "../users_kids/users_kids.model";
import { IKidsFile } from "./kids_progress_report.interface";
import { KidsProgressReport } from "./kids_progress_report.schema";

const addReport = async (
  kids_id: string,
  data: Partial<IKidsFile>,
  file_paths: string[]
) => {
  let uploadedFiles: { url: string; public_id: string }[] = [];

  if (file_paths && file_paths.length > 0) {
    // Upload files to Cloudinary
    uploadedFiles = (
      await Promise.all(
        file_paths.map(async (filePath) => {
          // Only allow images
          if (!filePath.startsWith("/images/")) {
            return null; // skip videos or invalid files
          }

          const result = await uploadFileToCloudinary(filePath, "kidsReport");

          return {
            url: result.url,
            public_id: result.public_id,
          };
        })
      )
    ).filter(
      (file): file is { url: string; public_id: string; type: IMediaType } =>
        file !== null
    );
  }

  const with_files = { ...data, files: uploadedFiles };

  console.log(kids_id);
  console.log(with_files);

  const updatedReport = await KidsProgressReport.findOneAndUpdate(
    { kids_id },
    { $push: { report: with_files } },
    { new: true, runValidators: true }
  );

  if (!updatedReport) {
    if (file_paths?.length > 0) {
      file_paths.map((filePath) => unlink_file(filePath));
      uploadedFiles.map((path) => deleteFileFromCloudinary(path.public_id));
    }
    throw new Error("Kids progress report not found");
  }
  if (file_paths?.length > 0) {
    file_paths.map((filePath) => unlink_file(filePath));
  }
  return updatedReport;
};

const removeReport = async (kids_id: string, report_id: string) => {
  // Find the report object to get its files before deletion
  const reportDoc = await KidsProgressReport.findOne({ kids_id }).lean();
  if (!reportDoc) throw new Error("Kids progress report not found");

  const reportToRemove = reportDoc.report.find(
    (r) => r._id?.toString() === report_id
  );
  if (!reportToRemove) throw new Error("Report not found");

  // Remove the report object from the DB first
  const updatedReport = await KidsProgressReport.findOneAndUpdate(
    { kids_id },
    { $pull: { report: { _id: report_id } } },
    { new: true }
  );

  if (!updatedReport) {
    throw new Error("Failed to remove report from DB");
  }

  // Only after DB deletion succeeds, delete files from Cloudinary
  Promise.all(
    reportToRemove.files.map((file) => deleteFileFromCloudinary(file.public_id))
  ).catch((err) => logger.error("Error deleting files:", err));

  return updatedReport;
};
const getKidsReport = async (kids_id: string) => {
  const reportDoc = (await KidsProgressReport.findOne({ kids_id })
    .sort({ createdAt: -1 })
    .populate({ path: "kids_id", model: Kids }) // populate the kids_id field
    .lean()) as any; // optional: returns plain JS object instead of Mongoose document

  if (!reportDoc) {
    throw new Error("Kids progress report not found");
  }

  const report = {
    report_id: reportDoc._id,
    createdAt: reportDoc.createdAt,
    updatedAt: reportDoc.updatedAt,
    kid: {
      _id: reportDoc.kids_id._id,
      full_name: reportDoc.kids_id.full_name,
      gender: reportDoc.kids_id.gender,
      image: reportDoc.kids_id.image,
      avatar_id: reportDoc.kids_id.avatar_id,
      parent: reportDoc.kids_id.parent,
      //   createdAt: reportDoc.kids_id.createdAt,
      //   updatedAt: reportDoc.kids_id.updatedAt,
    },
    reports: reportDoc.report.map(
      (r: { _id: any; title: any; description: any; files: any[] }) => ({
        id: r._id,
        title: r.title,
        description: r.description,
        files: r.files.map((f: { public_id: any; url: any }) => ({
          public_id: f.public_id,
          url: f.url,
        })),
      })
    ),
  };

  return report;
};

export const KidsProgressReportService = {
  addReport,
  removeReport,
  getKidsReport,
};
