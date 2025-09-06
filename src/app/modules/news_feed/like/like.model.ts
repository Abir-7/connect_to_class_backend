import { model, Schema } from "mongoose";
import { ILike } from "./like.interface";

const like_schema = new Schema<ILike>(
  {
    post_id: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true, // track when a like was created/removed
  }
);

// Ensure a user can like a post only once
like_schema.index({ post_id: 1, user_id: 1 }, { unique: true });

export const Like = model<ILike>("Like", like_schema);
