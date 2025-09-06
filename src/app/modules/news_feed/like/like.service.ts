import mongoose from "mongoose";
import { Like } from "./like.model";

const toggle_post_like = async (
  post_id: string,
  user_id: string
): Promise<{ liked: boolean }> => {
  const existingLike = await Like.findOne({
    post_id: new mongoose.Types.ObjectId(post_id),
    user_id: new mongoose.Types.ObjectId(user_id),
  });

  if (existingLike) {
    // If like exists, remove it (unlike)
    await Like.deleteOne({ _id: existingLike._id });
    return { liked: false };
  } else {
    // Otherwise, add new like
    await Like.create({
      post_id: new mongoose.Types.ObjectId(post_id),
      user_id: new mongoose.Types.ObjectId(user_id),
    });
    return { liked: true };
  }
};

export const LikeService = {
  toggle_post_like,
};
