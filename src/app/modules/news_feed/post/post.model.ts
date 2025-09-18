import { Schema, model } from "mongoose";
import { IPost } from "./post.interface";

const PostSchema = new Schema<IPost>(
  {
    image: {
      type: [String],
      trim: true,
      default: [],
    },
    description: { type: String, required: true, trim: true },
    teacher: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true }
);

export const Post = model<IPost>("Post", PostSchema);
