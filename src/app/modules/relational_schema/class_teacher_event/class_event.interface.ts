import { Types } from "mongoose";

export interface IClassEventTeacher {
  event: Types.ObjectId;
  class: Types.ObjectId;
  teacher: Types.ObjectId;
}
