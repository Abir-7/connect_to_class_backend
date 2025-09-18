/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import AppError from "../../../errors/AppError";
import { uploadFileToCloudinary } from "../../../middleware/fileUpload/cloudinay_file_upload/cloudinaryUpload";
import unlink_file from "../../../middleware/fileUpload/unlink_files";
import { Post } from "./post.model";

const create_post = async (
  post_data: { description: string },
  user_id: string,
  images: string[]
) => {
  try {
    let uploadedImages: string[] = [];

    if (images && images.length > 0) {
      // Upload images to Cloudinary
      uploadedImages = await Promise.all(
        images.map(async (filePath) => {
          const result = await uploadFileToCloudinary(filePath, "postImage");
          return result.url;
        })
      );
    }

    if (images?.length > 0) {
      images.map((link) => unlink_file(link));
    }

    const created_post = await Post.create({
      ...post_data,
      teacher: user_id,
      image: uploadedImages,
    });

    return created_post;
  } catch (error) {
    if (images?.length > 0) {
      images.map((link) => unlink_file(link));
    }
    throw new AppError(500, "Failed to post");
  }
};

interface IMeta {
  total_item: number;
  total_page: number;
  limit: number;
  page: number;
}

interface IPaginatedPosts {
  posts: any[]; // or define proper IPost type
  meta: IMeta;
}

const get_all_post = async (page = 1, limit = 15): Promise<IPaginatedPosts> => {
  const skip = (page - 1) * limit;

  const posts = await Post.aggregate([
    // Join teacher (User)
    {
      $lookup: {
        from: "users",
        localField: "teacher",
        foreignField: "_id",
        as: "teacherInfo",
      },
    },
    { $unwind: "$teacherInfo" },

    // Join teacher profile
    {
      $lookup: {
        from: "userprofiles",
        localField: "teacher",
        foreignField: "user",
        as: "teacherProfile",
      },
    },
    { $unwind: { path: "$teacherProfile", preserveNullAndEmptyArrays: true } },

    // Lookup comments
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "post_id",
        as: "comments",
      },
    },
    { $addFields: { total_comments: { $size: "$comments" } } },

    // Lookup comment replies (based on all comment ids of this post)
    {
      $lookup: {
        from: "commentreplies",
        let: { commentIds: "$comments._id" },
        pipeline: [
          { $match: { $expr: { $in: ["$comment_id", "$$commentIds"] } } },
        ],
        as: "replies",
      },
    },
    { $addFields: { total_replies: { $size: "$replies" } } },

    // Lookup likes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "post_id",
        as: "likes",
      },
    },
    { $addFields: { total_likes: { $size: "$likes" } } },

    // Sort & paginate
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },

    // Projection
    {
      $project: {
        _id: 1,
        image: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        total_comments: 1,
        total_replies: 1,
        total_likes: 1,
        teacher: {
          _id: "$teacherInfo._id",
          email: "$teacherInfo.email",
          role: "$teacherInfo.role",
          full_name: "$teacherProfile.full_name",
          nick_name: "$teacherProfile.nick_name",
          image: "$teacherProfile.image",
        },
      },
    },
  ]);

  const total_item = await Post.countDocuments();
  const total_page = Math.ceil(total_item / limit);

  const meta: IMeta = {
    total_item,
    total_page,
    limit,
    page,
  };

  return {
    posts,
    meta,
  };
};

export const PostService = { create_post, get_all_post };
