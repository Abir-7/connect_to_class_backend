import { Schema, model, Document, Types } from "mongoose";

// ✅ Shared status values
export const kids_class_status = ["active", "leave"] as const;
export type IKidsClassStatus = (typeof kids_class_status)[number];

export interface IKidsClass extends Document {
  class: Types.ObjectId;
  kids_id: Types.ObjectId;
  status: IKidsClassStatus; // reuse type
  createdAt?: Date;
  updatedAt?: Date;
}

const kids_class_schema = new Schema<IKidsClass>(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: "TeachersClass",
      required: true,
    },
    kids_id: { type: Schema.Types.ObjectId, ref: "Kids", required: true },

    status: {
      type: String,
      enum: kids_class_status, // reuse the same array
      default: "active",
    },
  },
  { timestamps: true }
);

// Prevent duplicate (same kid in the same class twice)
kids_class_schema.index({ class: 1, kids_id: 1 }, { unique: true });

export const KidsClass = model<IKidsClass>("KidsClass", kids_class_schema);
