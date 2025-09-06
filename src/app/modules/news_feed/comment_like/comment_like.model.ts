import { Schema, model } from "mongoose";
import { ICommentLike } from "./comment_like.interface";

const commentLikeSchema = new Schema<ICommentLike>(
  {
    comment_id: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
      index: true,
    },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

// Optional: prevent duplicate likes on the same comment by the same user
commentLikeSchema.index({ comment_id: 1, user_id: 1 }, { unique: true });

export const CommentLike = model<ICommentLike>(
  "CommentLike",
  commentLikeSchema
);
