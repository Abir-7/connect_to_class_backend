import { Types } from "mongoose";

export interface IClass extends Document {
  class_name: string;
  description: string;
  image: string;
  teacher: Types.ObjectId;
}
