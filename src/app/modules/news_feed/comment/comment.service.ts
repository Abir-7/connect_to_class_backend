/* eslint-disable @typescript-eslint/no-explicit-any */
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
    comment_id: comment_id,
    user_id: user_id,
  });

  if (existing_like) {
    await CommentLike.deleteOne({ _id: existing_like._id });
    return { liked: false }; // user unliked
  } else {
    await CommentLike.create({
      comment_id: comment_id,
      user_id: user_id,
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
    comment_id: data.comment_id,
    user_id: data.user_id,
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
    await CommentLike.deleteMany({ comment_id: data.comment_id }, { session });

    // Step 2: Delete replies of the comment
    await CommentReply.deleteMany({ comment_id: data.comment_id }, { session });

    // Step 3: Delete the comment itself (only if it belongs to the user)
    const deletedComment = await Comment.findOneAndDelete(
      {
        _id: data.comment_id,
        user_id: data.user_id,
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

// const get_all_comment_of_post = async (postId: string) => {
//   const comments = await Comment.aggregate([
//     {
//       $match: {
//         post_id: new mongoose.Types.ObjectId(postId),
//       },
//     },
//     // Lookup replies for each comment
//     {
//       $lookup: {
//         from: "commentreplies", // MongoDB collection name
//         localField: "_id",
//         foreignField: "comment_id",
//         as: "replies",
//       },
//     },
//     // Count total replies
//     {
//       $addFields: {
//         totalReplies: { $size: "$replies" },
//       },
//     },
//     // Lookup user profile
//     {
//       $lookup: {
//         from: "userprofiles", // MongoDB collection name for UserProfile
//         localField: "user_id",
//         foreignField: "user",
//         as: "userProfile",
//       },
//     },
//     // Flatten userProfile array
//     {
//       $unwind: {
//         path: "$userProfile",
//         preserveNullAndEmptyArrays: true, // if profile is missing
//       },
//     },
//     {
//       $project: {
//         replies: 0, // remove full replies if not needed
//       },
//     },
//     {
//       $sort: { createdAt: -1 }, // newest first
//     },
//   ]);

const get_all_comment_of_post = async (
  postId: string,
  page = 1,
  limit = 15,
  currentUserId?: string // optional user_id
) => {
  const skip = (page - 1) * limit;

  const matchStage: any = {
    post_id: new mongoose.Types.ObjectId(postId),
  };

  const pipeline: any[] = [
    { $match: matchStage },

    // Lookup replies count
    {
      $lookup: {
        from: "commentreplies",
        localField: "_id",
        foreignField: "comment_id",
        as: "replies",
      },
    },
    {
      $addFields: {
        totalReplies: { $size: "$replies" },
      },
    },

    // Lookup likes
    {
      $lookup: {
        from: "commentlikes",
        localField: "_id",
        foreignField: "comment_id",
        as: "likes",
      },
    },
    {
      $addFields: {
        totalLikes: { $size: "$likes" },
      },
    },

    // Lookup user profile
    {
      $lookup: {
        from: "userprofiles",
        localField: "user_id",
        foreignField: "user",
        as: "userProfile",
      },
    },
    {
      $unwind: {
        path: "$userProfile",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Sort + Pagination
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  // 👇 If user_id is provided, add isLiked field
  if (currentUserId) {
    pipeline.push({
      $addFields: {
        isLiked: {
          $in: [new mongoose.Types.ObjectId(currentUserId), "$likes.user_id"],
        },
      },
    });
  } else {
    pipeline.push({
      $addFields: {
        isLiked: false,
      },
    });
  }

  // Final projection
  pipeline.push({
    $project: {
      replies: 0,
      likes: 0,
    },
  });

  const comments = await Comment.aggregate(pipeline);

  const totalComments = await Comment.countDocuments({
    post_id: new mongoose.Types.ObjectId(postId),
  });

  const meta = {
    total_item: totalComments,
    total_page: Math.ceil(totalComments / limit),
    limit,
    page,
  };

  const data = comments.map((c) => ({
    comment_id: c._id,
    comment: c.comment,
    total_replies: c.totalReplies,
    total_likes: c.totalLikes,
    is_liked: c.isLiked || false,
    full_name: c.userProfile?.full_name || "",
    image: c.userProfile?.image || "",
    user_id: c.user_id,
    createdAt: c.createdAt,
  }));

  return { data, meta };
};

//   return comments.map((c) => ({
//     comment_id: c._id,
//     comment: c.comment,
//     total_replies: c.totalReplies,
//     full_nmae: c.userProfile?.full_name || "",
//     image: c.userProfile?.image || "",
//     user_id: c.user_id,
//     createdAt: c.createdAt,
//   }));
// };

// const get_all_comment_of_post = async (
//   postId: string,
//   page = 1,
//   limit = 15
// ) => {
//   const skip = (page - 1) * limit;

//   const comments = await Comment.aggregate([
//     {
//       $match: {
//         post_id: new mongoose.Types.ObjectId(postId),
//       },
//     },
//     {
//       $lookup: {
//         from: "commentreplies",
//         localField: "_id",
//         foreignField: "comment_id",
//         as: "replies",
//       },
//     },
//     {
//       $addFields: {
//         totalReplies: { $size: "$replies" },
//       },
//     },
//     {
//       $lookup: {
//         from: "userprofiles",
//         localField: "user_id",
//         foreignField: "user",
//         as: "userProfile",
//       },
//     },
//     {
//       $unwind: {
//         path: "$userProfile",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $project: {
//         replies: 0,
//       },
//     },
//     {
//       $sort: { createdAt: -1 },
//     },
//     { $skip: skip },
//     { $limit: limit },
//   ]);

//   const totalComments = await Comment.countDocuments({
//     post_id: new mongoose.Types.ObjectId(postId),
//   });

//   const meta = {
//     total_item: totalComments,
//     total_page: Math.ceil(totalComments / limit),
//     limit,
//     page,
//   };

//   const data = comments.map((c) => ({
//     comment_id: c._id,
//     comment: c.comment,
//     total_replies: c.totalReplies,
//     full_name: c.userProfile?.full_name || "",
//     image: c.userProfile?.image || "",
//     user_id: c.user_id,
//     createdAt: c.createdAt,
//   }));

//   return { data, meta };
// };

const get_reply_list_of_a_comment = async (comment_id: string) => {
  const replies = await CommentReply.aggregate([
    {
      $match: { comment_id: new mongoose.Types.ObjectId(comment_id) },
    },
    // Lookup user profile for each reply's user
    {
      $lookup: {
        from: "userprofiles",
        localField: "user_id",
        foreignField: "user",
        as: "userProfile",
      },
    },
    { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } },
    // Only keep needed fields
    {
      $project: {
        _id: 1, // replyId
        reply: 1,
        user_id: 1,
        "userProfile.full_name": 1,
        "userProfile.image": 1,
      },
    },
    { $sort: { createdAt: 1 } }, // oldest -> newest
  ]);

  return replies.map((r) => ({
    replyId: r._id,
    reply: r.reply,
    userId: r.user_id,
    userName: r.userProfile?.full_name || "",
    image: r.userProfile?.image || "",
  }));
};

export const CommentService = {
  create_comment,
  toggle_comment_like,
  create_reply,
  delete_comment,
  get_all_comment_of_post,
  get_reply_list_of_a_comment,
};
