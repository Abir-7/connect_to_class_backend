import { model, Schema } from "mongoose";
import { ICommentReply } from "./comment_reply.interface";

const commentReplySchema = new Schema<ICommentReply>(
  {
    comment_id: { type: Schema.Types.ObjectId, ref: "Comment", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reply: { type: String, required: true, trim: true },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

const CommentReply = model<ICommentReply>("CommentReply", commentReplySchema);

export default CommentReply;
