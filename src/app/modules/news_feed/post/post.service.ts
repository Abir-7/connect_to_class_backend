/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Post } from "./post.model";

const create_post = async (
  post_data: { image: string; description: string },
  user_id: string
) => {
  const created_post = await Post.create({ ...post_data, teacher: user_id });

  return created_post;
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
    {
      $lookup: {
        from: "users",
        localField: "teacher",
        foreignField: "_id",
        as: "teacherInfo",
      },
    },
    { $unwind: "$teacherInfo" },
    {
      $lookup: {
        from: "userprofiles",
        localField: "teacher",
        foreignField: "user",
        as: "teacherProfile",
      },
    },
    { $unwind: { path: "$teacherProfile", preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        image: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
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
