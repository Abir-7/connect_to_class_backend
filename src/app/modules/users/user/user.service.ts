/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import mongoose from "mongoose";
import { get_cache, set_cache } from "../../../lib/redis/cache";
import { UserProfile } from "../user_profile/user_profile.model";
import { get_date_range } from "../../../helperFunction/general/get_date_range";
import User from "./user.model";
import Kids from "../users_kids/users_kids.model";

const CACHE_TTL = 60 * 120; // 5 minutes

const get_my_data = async (userId: string) => {
  const cacheKey = `user_profile:${userId}`;
  const cachedData = await get_cache<any>(cacheKey);
  if (cachedData) return cachedData;

  const userProfile = await UserProfile.findOne({ user: userId })
    .populate("user")
    .lean(); // convert to plain JS object

  if (!userProfile) return null;

  const {
    _id: profileId,
    full_name,
    nick_name,
    date_of_birth,
    phone,
    address,
    image,
  } = userProfile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { _id: user_id, email, role } = (userProfile.user as any) || {};

  const result = {
    _id: user_id,
    email,
    role,
    full_name,
    nick_name,
    date_of_birth,
    phone,
    address,
    image,
  };

  set_cache(cacheKey, result, CACHE_TTL).catch(() => {});

  return result;
};

const overview_recent_user = async (
  type: "last7days" | "lastMonth",
  search?: string,
  page: number = 1,
  limit: number = 10
) => {
  const { start, end } = get_date_range(type);

  const pipeline: mongoose.PipelineStage[] = [
    // Teachers & Parents
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $lookup: {
        from: "userprofiles",
        localField: "_id",
        foreignField: "user",
        as: "profile",
      },
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        email: 1,
        role: 1,
        is_verified: 1,
        createdAt: 1,
        full_name: { $ifNull: ["$profile.full_name", "N/A"] },
        nick_name: { $ifNull: ["$profile.nick_name", "N/A"] },
        phone: { $ifNull: ["$profile.phone", "N/A"] },
        address: { $ifNull: ["$profile.address", "N/A"] },
        image: { $ifNull: ["$profile.image", "N/A"] },
        parent: "N/A",
        gender: "N/A",
        avatar_id: "N/A",
      },
    },
    // Students (Kids)
    {
      $unionWith: {
        coll: "kids",
        pipeline: [
          { $match: { createdAt: { $gte: start, $lte: end } } },
          // Lookup parent profile
          {
            $lookup: {
              from: "userprofiles",
              localField: "parent",
              foreignField: "user",
              as: "parent_profile",
            },
          },
          {
            $addFields: {
              parent_name: {
                $ifNull: [
                  { $arrayElemAt: ["$parent_profile.full_name", 0] },
                  "N/A",
                ],
              },
            },
          },
          {
            $project: {
              _id: 0,
              email: "N/A",
              role: { $literal: "student" },
              is_verified: "N/A",
              createdAt: 1,
              full_name: "$full_name",
              nick_name: "N/A",
              phone: "N/A",
              address: "N/A",
              image: "$image",
              parent: "$parent_name",
              gender: "$gender",
              avatar_id: "$avatar_id",
            },
          },
        ],
      },
    },
  ];

  // 🔍 Apply search
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { email: { $regex: search, $options: "i" } },
          { full_name: { $regex: search, $options: "i" } },
          { nick_name: { $regex: search, $options: "i" } },
          { gender: { $regex: search, $options: "i" } },
          { parent: { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  // 🔢 Get total count after search and union
  const countResult = await User.aggregate([...pipeline, { $count: "total" }]);
  const total_item = countResult[0]?.total || 0;
  const total_page = Math.ceil(total_item / limit);

  // 📄 Pagination
  const recentUsers = await User.aggregate([
    ...pipeline,
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);

  const meta = { total_item, total_page, limit, page };

  return { recent: recentUsers, meta };
};

const overview_get_total_users = async () => {
  const [teachers, parents, students] = await Promise.all([
    User.countDocuments({ role: "teacher" }),
    User.countDocuments({ role: "parent" }),
    Kids.countDocuments({}), // all kids are students
  ]);

  return {
    totals: {
      teachers,
      parents,
      students,
      all: teachers + parents + students,
    },
  };
};

export const UserService = {
  get_my_data,
  overview_recent_user,
  overview_get_total_users,
};
