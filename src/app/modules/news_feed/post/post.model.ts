import { Schema, model } from "mongoose";
import { IMediaType, IPost } from "./post.interface";

const PostSchema = new Schema<IPost>(
  {
    files: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        type: { type: String, enum: Object.values(IMediaType), required: true },
        _id: false,
      },
    ],
    description: { type: String, required: true, trim: true },
    teacher: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true }
);

export const Post = model<IPost>("Post", PostSchema);
