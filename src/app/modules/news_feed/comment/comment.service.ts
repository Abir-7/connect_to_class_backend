/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import mongoose from "mongoose";
import { ICommentLike } from "../comment_like/comment_like.interface";
import { CommentLike } from "../comment_like/comment_like.model";
import { IComment } from "./comment.interface";
import { Comment } from "./comment.model";
import CommentReply from "../comment_reply/comment_reply.model";
import { ICommentReply } from "../comment_reply/comment_reply.interface";

const create_comment = async (data: {
  post_id: string;
  user_id: string;
  comment: string;
}): Promise<IComment> => {
  const newComment = await Comment.create({
    post_id: data.post_id,
    user_id: data.user_id,
    comment: data.comment,
  });

  return newComment;
};

const toggle_comment_like = async (
  comment_id: string,
  user_id: string
): Promise<{ liked: boolean; like?: ICommentLike }> => {
  // Check if user already liked this comment
  const existing_like = await CommentLike.findOne({
    comment_id: new mongoose.Types.ObjectId(comment_id),
    user_id: new mongoose.Types.ObjectId(user_id),
  });

  if (existing_like) {
    await CommentLike.deleteOne({ _id: existing_like._id });
    return { liked: false }; // user unliked
  } else {
    await CommentLike.create({
      comment_id: new mongoose.Types.ObjectId(comment_id),
      user_id: new mongoose.Types.ObjectId(user_id),
    });

    return { liked: true };
  }
};

interface ICreateReplyInput {
  comment_id: string;
  user_id: string;
  reply: string;
}

const create_reply = async (
  data: ICreateReplyInput
): Promise<ICommentReply> => {
  const reply_data = {
    comment_id: new mongoose.Types.ObjectId(data.comment_id),
    user_id: new mongoose.Types.ObjectId(data.user_id),
    reply: data.reply,
  };
  const created_reply = await CommentReply.create(reply_data);
  return created_reply;
};
const delete_comment = async (data: {
  comment_id: string;
  user_id: string;
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Delete likes of the comment
    await CommentLike.deleteMany(
      { comment_id: new mongoose.Types.ObjectId(data.comment_id) },
      { session }
    );

    // Step 2: Delete replies of the comment
    await CommentReply.deleteMany(
      { comment_id: new mongoose.Types.ObjectId(data.comment_id) },
      { session }
    );

    // Step 3: Delete the comment itself (only if it belongs to the user)
    const deletedComment = await Comment.findOneAndDelete(
      {
        _id: new mongoose.Types.ObjectId(data.comment_id),
        user_id: new mongoose.Types.ObjectId(data.user_id),
      },
      { session }
    );

    if (!deletedComment) {
      throw new Error("Comment not found or unauthorized");
    }

    await session.commitTransaction();
    session.endSession();

    return deletedComment;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const CommentService = {
  create_comment,
  toggle_comment_like,
  create_reply,
  delete_comment,
};
