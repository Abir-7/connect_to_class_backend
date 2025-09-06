import { Document, Types } from "mongoose";

export interface IKids extends Document {
  parent: Types.ObjectId;
  gender: Gender;
  full_name: string;
  image: string;
  avatar_id: string;
}
export enum Gender {
  Male = "male",
  Female = "female",
  Other = "other",
}
