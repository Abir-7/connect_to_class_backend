import { Document, Types } from "mongoose";

export interface ICommentReply extends Document {
  comment_id: Types.ObjectId;
  user_id: Types.ObjectId;
  reply: string;
}
