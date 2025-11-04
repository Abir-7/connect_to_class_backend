import { model, Schema } from "mongoose";
import {
  IKidsProgressReport,
  IKidsFile,
} from "./kids_progress_report.interface";

const FileSchema = new Schema(
  {
    public_id: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const ReportSchema = new Schema<IKidsFile>({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  files: [FileSchema], // array of files
});

const KidsProgressReportSchema = new Schema<IKidsProgressReport>(
  {
    kids_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "kids",
      unique: true,
    },
    report: [ReportSchema],
  },
  { timestamps: true }
);

export const KidsProgressReport = model<IKidsProgressReport>(
  "KidsProgressReport",
  KidsProgressReportSchema
);
