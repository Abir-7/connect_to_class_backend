import { Schema, model, Document, Types } from "mongoose";
import {
  kids_class_status,
  IKidsClassStatus,
} from "./kids_class.interface.model";

export interface IParentClass extends Document {
  class: Types.ObjectId;
  parent_id: Types.ObjectId;
  status: IKidsClassStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const parent_class_schema = new Schema<IParentClass>(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: "TeachersClass",
      required: true,
    },
    status: {
      type: String,
      enum: kids_class_status, // reuse the same array
      default: "active",
    },
    parent_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // parent user
  },
  { timestamps: true }
);

// Prevent duplicate parent-class relationship
parent_class_schema.index({ class: 1, parent_id: 1 }, { unique: true });

export const ParentClass = model<IParentClass>(
  "ParentClass",
  parent_class_schema
);
