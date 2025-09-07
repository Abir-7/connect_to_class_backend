import { model, Schema } from "mongoose";
import { ITeachersClass } from "./teachers_class.interface";

const teachers_class_schema: Schema<ITeachersClass> = new Schema(
  {
    class_name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, default: "" },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const TeachersClass = model<ITeachersClass>(
  "TeachersClass",
  teachers_class_schema
);

export default TeachersClass;
