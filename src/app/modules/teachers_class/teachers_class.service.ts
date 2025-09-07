/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import mongoose from "mongoose";
import { delete_caches, get_cache, set_cache } from "../../lib/redis/cache";
import User from "../users/user/user.model";
import { KidsClass } from "./relational_schema/kids_class.interface.model";
import { ParentClass } from "./relational_schema/parent_class.interface.model";
import TeachersClass from "./teachers_class.model";

import logger from "../../utils/serverTools/logger";

interface ICreateTeachersClassInput {
  class_name: string;
  description: string;
  image?: string;
}

const create_teachers_class = async (
  data: ICreateTeachersClassInput,
  user_id: string
) => {
  const class_data = {
    ...data,
    image: data.image || "",
    teacher: user_id,
  };

  const created_class = await TeachersClass.create(class_data);

  const cache_key = `teacher_classes:${user_id}`;
  await set_cache(cache_key, null, 0); // clear cache

  return created_class;
};

const get_my_class = async (user_id: string) => {
  const cache_key = `teacher_classes:${user_id}`;

  const cachedData = await get_cache<any[]>(cache_key);
  if (cachedData) return cachedData;

  const class_list = await TeachersClass.find({ teacher: user_id }).lean();

  await set_cache(cache_key, class_list, 3600);

  return class_list;
};

interface IUserSearchResult {
  _id: string;
  email: string;
  role: string;

  full_name: string;
  nick_name: string;
  phone: string;
  image: string;
}

const search_users = async (
  searchTerm?: string
): Promise<IUserSearchResult[]> => {
  if (!searchTerm || searchTerm.trim() === "") return [];

  const regex = new RegExp(searchTerm, "i");

  const users = await User.aggregate<IUserSearchResult>([
    // Join profile
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
      $match: {
        $or: [
          { email: regex },
          { "profile.full_name": regex },
          { "profile.phone": regex },
        ],
      },
    },

    {
      $project: {
        _id: { $toString: "$_id" },
        email: 1,
        role: 1,
        full_name: "$profile.full_name",
        nick_name: "$profile.nick_name",
        phone: "$profile.phone",
        image: "$profile.image",
      },
    },
  ]);

  return users; // This is plain JS object array
};

const add_kids_to_class = async (data: {
  kids_id: string;
  parent_id: string;
  class_id: string;
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Add kid to class (always allow multiple entries)
    const class_kids = await KidsClass.create(
      [
        {
          class: data.class_id,
          kids_id: data.kids_id,
        },
      ],
      { session }
    );

    // 2️⃣ Add parent to class ONLY if not already added
    let class_parent: any = null;

    const existingParent = await ParentClass.findOne({
      class: data.class_id,
      parent_id: data.parent_id,
    }).session(session);

    if (!existingParent) {
      const createdParent = await ParentClass.create(
        [
          {
            class: data.class_id,
            parent_id: data.parent_id,
          },
        ],
        { session }
      );
      class_parent = createdParent[0];
    } else {
      class_parent = existingParent;
    }

    await session.commitTransaction();
    session.endSession();

    // 3️⃣ Invalidate both kids + parents cache
    await delete_caches([
      `class:${data.class_id}:kids`,
      `class:${data.class_id}:parents`,
    ]);

    return {
      class_kids: class_kids[0],
      class_parent,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const get_kids_parent_list_of_a_class = async (
  class_id: string,
  filter: "kids" | "parents"
) => {
  const cacheKey = `class:${class_id}:${filter}`;

  //1️⃣ Try cache
  const cached = await get_cache<any[]>(cacheKey);
  if (cached) return cached;

  const classObjectId = new mongoose.Types.ObjectId(class_id);
  let result: any[] = [];

  if (filter === "kids") {
    logger.info("hits");
    result = await KidsClass.aggregate([
      { $match: { class: classObjectId } },
      {
        $lookup: {
          from: "kids",
          localField: "kids_id",
          foreignField: "_id",
          as: "kid",
        },
      },
      { $unwind: "$kid" },
      {
        $project: {
          _id: 1,
          class: 1,
          profile: {
            _id: "$kid._id",
            full_name: "$kid.full_name",
            gender: "$kid.gender",
            image: "$kid.image",
            avatar_id: "$kid.avatar_id",
            type: filter,
          },
        },
      },
    ]);
  } else if (filter === "parents") {
    result = await ParentClass.aggregate([
      { $match: { class: classObjectId } },
      {
        $lookup: {
          from: "users",
          localField: "parent_id",
          foreignField: "_id",
          as: "parent",
        },
      },
      { $unwind: "$parent" },
      {
        $lookup: {
          from: "userprofiles",
          localField: "parent_id",
          foreignField: "user",
          as: "parentProfile",
        },
      },
      { $unwind: { path: "$parentProfile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          class: 1,
          profile: {
            _id: "$parent._id",
            email: "$parent.email",
            full_name: "$parentProfile.full_name",
            nick_name: "$parentProfile.nick_name",
            image: "$parentProfile.image",
            type: filter,
          },
        },
      },
    ]);
  }

  // 2️⃣ Save to cache for 30 minutes
  await set_cache(cacheKey, result, 1800);

  return result;
};

export const TeachersClassService = {
  create_teachers_class,
  get_my_class,
  search_users,
  add_kids_to_class,
  get_kids_parent_list_of_a_class,
};
