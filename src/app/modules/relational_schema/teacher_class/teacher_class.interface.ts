import { Types } from "mongoose";

export interface ITeacherClass {
  teacher: Types.ObjectId;
  class: Types.ObjectId;
}
