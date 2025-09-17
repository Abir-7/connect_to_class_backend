import mongoose, { Schema, Document } from "mongoose";
import { IPrivacy } from "./privacy_policy.interface";

const privacy_schema: Schema<IPrivacy & Document> = new Schema(
  {
    title: { type: String, required: true },
    editor_html: { type: String, required: true },
  },
  { timestamps: true }
);

export const Privacy = mongoose.model<IPrivacy & Document>(
  "Privacy",
  privacy_schema
);
