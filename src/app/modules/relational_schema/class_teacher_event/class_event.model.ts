import { model, Schema } from "mongoose";
import { IClassEventTeacher } from "./class_event.interface";

const class_event_teacher: Schema<IClassEventTeacher> = new Schema(
  {
    event: { type: Schema.Types.ObjectId, required: true, ref: "Event" },
    class: { type: Schema.Types.ObjectId, required: true, ref: "KidsClass" },
    teacher: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const ClassEventTeacher = model<IClassEventTeacher>(
  "ClassEvent",
  class_event_teacher
);

export default ClassEventTeacher;
