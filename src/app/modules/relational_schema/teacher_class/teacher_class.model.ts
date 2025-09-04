import { model, Schema } from "mongoose";
import { ITeacherClass } from "./teacher_class.interface";

const TeacherClassSchema: Schema<ITeacherClass> = new Schema(
  {
    teacher: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    class: { type: Schema.Types.ObjectId, required: true, ref: "KidsClass" },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const TeacherClass = model<ITeacherClass>("TeacherClass", TeacherClassSchema);

export default TeacherClass;
