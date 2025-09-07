import { Schema, model, Document, Types } from "mongoose";

export interface IKidsClass extends Document {
  class: Types.ObjectId;
  kids_id: Types.ObjectId;
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
  },
  { timestamps: true }
);

// Prevent duplicate (same kids in the same class twice)
kids_class_schema.index({ class_id: 1, kids_id: 1 }, { unique: true });

export const KidsClass = model<IKidsClass>("KidsClass", kids_class_schema);
