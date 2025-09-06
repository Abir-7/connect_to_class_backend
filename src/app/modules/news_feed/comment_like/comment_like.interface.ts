import { Document, Types } from "mongoose";

export interface ICommentLike extends Document {
  comment_id: Types.ObjectId;
  user_id: Types.ObjectId;
}
