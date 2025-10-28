import { Types } from "mongoose";

export interface ITeachersClass extends Document {
  class_name: string;
  description: string;
  image: string;
  teacher: Types.ObjectId;
  image_id: string;
}

export enum ClassMemberFilter {
  KIDS = "kids",
  PARENTS = "parents",
}
