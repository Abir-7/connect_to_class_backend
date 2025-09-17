import { Types } from "mongoose";

export interface IPrivacy {
  _id: Types.ObjectId;
  title: string;
  editor_html: string;
  createdAt?: Date;
  updatedAt?: Date;
}
