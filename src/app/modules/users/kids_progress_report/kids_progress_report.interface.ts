import { Types } from "mongoose";

export interface IKidsFile {
  _id?: string; // <-- add this
  title: string;
  description?: string;
  files: { public_id: string; url: string }[];
}

export interface IKidsProgressReport {
  _id?: string;
  kids_id: Types.ObjectId;
  report: IKidsFile[];
  createdAt?: Date;
  updatedAt?: Date;
}
