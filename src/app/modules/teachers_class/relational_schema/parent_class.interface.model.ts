import { Schema, model, Document, Types } from "mongoose";

export interface IParentClass extends Document {
  class: Types.ObjectId;
  parent_id: Types.ObjectId;
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
    parent_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // parent user
  },
  { timestamps: true }
);

// Prevent duplicate parent-class relationship
parent_class_schema.index({ class_id: 1, parent_id: 1 }, { unique: true });

export const ParentClass = model<IParentClass>(
  "ParentClass",
  parent_class_schema
);
