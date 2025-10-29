import { model, Schema } from "mongoose";
import { IKidsProgressReport } from "./kids_progress_report.interface";

const KidsProgressReportSchema = new Schema<IKidsProgressReport>(
  {
    kids_id: { type: String, required: true, ref: "kids" },
    files: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        url: { type: String, required: true }, // array of strings
      },
    ],
  },
  { timestamps: true }
);

export const KidsProgressReport = model<IKidsProgressReport>(
  "KidsProgressReport",
  KidsProgressReportSchema
);
