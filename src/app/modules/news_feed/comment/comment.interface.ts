import { Document, Types } from "mongoose";

export interface IComment extends Document {
  post_id: Types.ObjectId;
  user_id: Types.ObjectId;
  comment: string;
}
