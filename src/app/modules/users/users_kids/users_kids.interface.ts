import { Types } from "mongoose";

export interface IKids {
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
