import { KidsClass } from "./relational_schema/kids_class.interface.model";
/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import mongoose, { Types } from "mongoose";
import {
  delete_cache,
  delete_caches,
  get_cache,
  set_cache,
} from "../../lib/redis/cache";
import User from "../users/user/user.model";

import { ParentClass } from "./relational_schema/parent_class.interface.model";
import TeachersClass from "./teachers_class.model";

import logger from "../../utils/serverTools/logger";

import AppError from "../../errors/AppError";
import { create_default_class_chats } from "../../helperFunction/with_db_query/create_group_when_new_class_create";

import { app_config } from "../../config";
import unlink_file from "../../middleware/fileUpload/multer_file_storage/unlink_files";
import Kids from "../users/users_kids/users_kids.model";
import { ensureParentChats } from "../../helperFunction/with_db_query/add_parent_to_class_group_when_add";

//import AppError from "../../errors/AppError";

interface ICreateTeachersClassInput {
  class_name: string;
  description: string;
  image?: string;
}

const create_teachers_class = async (
  data: ICreateTeachersClassInput,
  teacher_id: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Create the class
    const classData = {
      ...data,
      image: data.image ? `${app_config.server.baseurl}${data.image}` : "",
      teacher: teacher_id,
      image_id: data.image ? `${data.image}` : "",
    };
    const created_class = await TeachersClass.create([classData], { session });

    await create_default_class_chats(
      created_class[0]._id.toString(),
      teacher_id,
      session
    );

    await session.commitTransaction();
    session.endSession();

    // 4️⃣ Clear cache
    const cache_key = `teacher_classes:${teacher_id}`;
    await delete_cache(cache_key); // clear cache

    return created_class[0];
  } catch (error) {
    if (data.image) {
      unlink_file(data.image);
    }

    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const get_my_class = async (user_id: string) => {
  const cache_key = `teacher_classes:${user_id}`;

  const cachedData = await get_cache<any[]>(cache_key);
  if (cachedData) return cachedData;

  const result = await TeachersClass.aggregate([
    { $match: { teacher: new Types.ObjectId(user_id) } }, // Only this teacher's classes
    {
      $lookup: {
        from: "kidsclasses", // collection name of KidsClass
        localField: "_id",
        foreignField: "class",
        as: "kids",
      },
    },
    {
      $addFields: {
        total_students: {
          $size: {
            $filter: {
              input: "$kids",
              as: "kid",
              cond: { $eq: ["$$kid.status", "active"] }, // count only active
            },
          },
        },
      },
    },
    {
      $project: {
        kids: 0, // hide the kids array
      },
    },
  ]);

  await set_cache(cache_key, result, 3600);
  return result;
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

const add_kids_to_class = async (
  data: {
    kids_id: string;
    parent_id: string;
    class_id: string;
  },
  teacher_id: string
) => {
  const teacher_class = await TeachersClass.findOne({
    teacher: teacher_id,
    _id: data.class_id,
  });

  if (!teacher_class) {
    throw new AppError(404, "Class not found.");
  }

  const kids_class = await KidsClass.findOne({
    kids_id: data.kids_id,
  });

  if (kids_class) {
    if (kids_class.class.toString() === data.class_id) {
      throw new AppError(400, "Kids already joined in the class");
    } else {
      throw new AppError(400, "Kids already joined in another class");
    }
  }

  const parant_class = await ParentClass.findOne({
    parent_id: data.parent_id,
    class: data.class_id,
  }).lean();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Add kid to class
    const class_kids = await KidsClass.create(
      [
        {
          class: data.class_id,
          kids_id: data.kids_id,
        },
      ],
      { session }
    );
    let class_parent;
    // Add parent to class
    if (!parant_class) {
      class_parent = await ParentClass.create(
        [
          {
            class: data.class_id,
            parent_id: data.parent_id,
          },
        ],
        { session }
      );
    } else {
      class_parent = [parant_class];
    }
    await ensureParentChats(data.parent_id, teacher_id, data.class_id, session);
    await session.commitTransaction();
    session.endSession();

    // ❌ Invalidate both kids + parents cache
    await delete_caches([
      `class:${data.class_id}:kids`,
      `class:${data.class_id}:parents`,
    ]);

    return {
      class_kids: class_kids[0],
      class_parent: class_parent[0],
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// const add_kids_to_class = async (
//   data: {
//     kids_id: string;
//     parent_id: string;
//     class_id: string; // target class
//   },
//   teacher_id: string
// ) => {
//   const isClassValid = await TeachersClass.findOne({
//     teacher: teacher_id,
//     _id: data.class_id,
//   });

//   if (!isClassValid) {
//     throw new AppError(404, "Class not found.");
//   }

//   // 1️⃣ Fetch all kids of the parent
//   const parentKids = await Kids.find({ parent: data.parent_id }).lean();
//   const parentKidsIds = parentKids.map((k) => String(k._id));

//   // 2️⃣ Fetch all current class assignments of these kids
//   const kidsClasses = await KidsClass.find({
//     kids_id: { $in: parentKidsIds },
//   }).lean();

//   const kidCurrentClass = kidsClasses
//     .find((k) => String(k.kids_id) === data.kids_id && k.status === "active")
//     ?.class.toString();

//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // 3️⃣ If kid is already in target class → nothing to do
//     const existingTargetKidClass = await KidsClass.findOne({
//       kids_id: data.kids_id,
//       class: data.class_id,
//     }).session(session);

//     if (existingTargetKidClass?.status === "active") {
//       await session.commitTransaction();
//       session.endSession();
//       const parentClass = await ParentClass.findOne({
//         parent_id: data.parent_id,
//         class: data.class_id,
//       }).lean();
//       return {
//         parent_class: parentClass,
//         kids_class: existingTargetKidClass.toObject(),
//       };
//     }

//     // 4️⃣ Mark old class as leave (if any)
//     if (kidCurrentClass && kidCurrentClass !== data.class_id) {
//       await KidsClass.updateOne(
//         { kids_id: data.kids_id, class: kidCurrentClass },
//         { status: "leave" },
//         { session }
//       );

//       // Parent in old class
//       const otherActiveKidsInOldClass = kidsClasses.filter(
//         (k) =>
//           String(k.kids_id) !== data.kids_id &&
//           String(k.class) === kidCurrentClass &&
//           k.status === "active"
//       );

//       if (otherActiveKidsInOldClass.length === 0) {
//         // No other active kids → parent leave
//         await ParentClass.updateOne(
//           { parent_id: data.parent_id, class: kidCurrentClass },
//           { status: "leave" },
//           { session }
//         );
//       } else {
//         // Parent stays active
//         await ParentClass.updateOne(
//           { parent_id: data.parent_id, class: kidCurrentClass },
//           { status: "active" },
//           { session }
//         );
//       }
//     }

//     // 5️⃣ Upsert target kid-class
//     const updatedKidClass = await KidsClass.findOneAndUpdate(
//       { kids_id: data.kids_id, class: data.class_id },
//       { kids_id: data.kids_id, class: data.class_id, status: "active" },
//       { new: true, upsert: true, session }
//     );

//     // 6️⃣ Upsert target parent-class
//     await ParentClass.updateOne(
//       { parent_id: data.parent_id, class: data.class_id },
//       { parent_id: data.parent_id, class: data.class_id, status: "active" },
//       { upsert: true, session }
//     );

//     await ensureParentChats(data.parent_id, teacher_id, data.class_id, session);

//     await session.commitTransaction();
//     session.endSession();

//     // 7️⃣ Invalidate caches
//     const affectedClassIds = new Set<string>();

//     if (kidCurrentClass) affectedClassIds.add(kidCurrentClass);
//     if (data.class_id) affectedClassIds.add(data.class_id);

//     await delete_caches(
//       Array.from(affectedClassIds).flatMap((classId) => [
//         `class:${classId}:kids`,
//         `class:${classId}:parents`,
//       ])
//     );
//     delete_cache(`teacher_classes:${teacher_id}`);
//     const parentClass = await ParentClass.findOne({
//       parent_id: data.parent_id,
//       class: data.class_id,
//     }).lean();

//     return {
//       parent_class: parentClass,
//       kids_class: updatedKidClass.toObject(),
//     };
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };

const get_kids_parent_list_of_a_class = async (
  class_id: string,
  filter: "kids" | "parents"
) => {
  const cacheKey = `class:${class_id}:${filter}`;

  // 1️⃣ Try cache
  const cached = await get_cache<any[]>(cacheKey);
  if (cached) return cached;

  const classObjectId = new mongoose.Types.ObjectId(class_id);
  let result: any[] = [];

  if (filter === "kids") {
    logger.info("hits");
    result = await KidsClass.aggregate([
      { $match: { class: classObjectId, status: "active" } },
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
          status: 1,
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
      { $match: { class: classObjectId, status: "active" } },

      // ✅ Join with user table
      {
        $lookup: {
          from: "users",
          localField: "parent_id",
          foreignField: "_id",
          as: "parent",
        },
      },
      { $unwind: "$parent" },

      // ✅ Join with user profile table
      {
        $lookup: {
          from: "userprofiles",
          localField: "parent_id",
          foreignField: "user",
          as: "parentProfile",
        },
      },
      { $unwind: { path: "$parentProfile", preserveNullAndEmptyArrays: true } },

      // ✅ Lookup kids of this parent that are also in the same class
      {
        $lookup: {
          from: "kidsclasses", // 👈 collection name of KidsClass
          let: { parentId: "$parent_id", classId: "$class" },
          pipeline: [
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
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$class", "$$classId"] }, // same class
                    { $eq: ["$kid.parent", "$$parentId"] }, // kid belongs to this parent
                    { $eq: ["$status", "active"] }, // only active kids
                  ],
                },
              },
            },
          ],
          as: "kidsInSameClass",
        },
      },

      // ✅ Project the final shape
      {
        $project: {
          _id: 1,
          class: 1,
          status: 1,
          profile: {
            _id: "$parent._id",
            email: "$parent.email",
            full_name: "$parentProfile.full_name",
            nick_name: "$parentProfile.nick_name",
            image: "$parentProfile.image",
            type: filter,
          },
          total_kids: { $size: "$kidsInSameClass" }, // 👈 count kids in this class
        },
      },
    ]);
  }

  // 2️⃣ Save to cache for 30 minutes
  await set_cache(cacheKey, result, 1800);

  return result;
};

const removeKidsFromClass = async (class_id: string, kids_id: string) => {
  // 1️⃣ Fetch only needed field
  const kidData = await Kids.findById(kids_id, { parent: 1 }).lean();
  if (!kidData) throw new AppError(404, "Kid not found.");

  // 2️⃣ Get all kids of same parent
  const kids = await Kids.find({ parent: kidData.parent }, { _id: 1 }).lean();
  const kidsIds = kids.map((k) => k._id);

  // 3️⃣ Count active kids in same class
  const activeCount = await KidsClass.countDocuments({
    kids_id: { $in: kidsIds },
    class: class_id,
    status: { $ne: "leave" }, // optional filter
  });

  // 4️⃣ Always mark this kid as "leave"
  const kidUpdatePromise = KidsClass.findOneAndUpdate(
    { kids_id, class: class_id },
    { status: "leave" },
    { new: true }
  ).exec();

  // 5️⃣ Optionally mark parent's class as "leave"
  let parentUpdatePromise: Promise<any> = Promise.resolve(null);
  if (activeCount <= 1) {
    parentUpdatePromise = ParentClass.findOneAndUpdate(
      { parent_id: kidData.parent, class: class_id },
      { status: "leave" },
      { new: true }
    ).exec();
  }

  // ✅ Run both safely without type conflict
  await Promise.all([kidUpdatePromise, parentUpdatePromise]);

  return { message: "Kid removed from class successfully." };
};

const editClass = async (
  class_id: string,
  data: {
    class_name: string;
    image: string;
    description: string;
    image_id: string;
  }
) => {
  const find_class = await TeachersClass.findOne({ _id: class_id });

  if (!find_class) {
    throw new AppError(404, "No Class found to update.");
  }

  const old_image = find_class.image_id;

  const updated_data = await TeachersClass.findOneAndUpdate(
    { _id: class_id },
    data,
    { new: true }
  );

  if (data.image && old_image) {
    unlink_file(old_image);
  }

  if (!updated_data && data.image) {
    unlink_file(data.image_id);
  }

  return updated_data;
};

export const TeachersClassService = {
  create_teachers_class,
  get_my_class,
  search_users,
  // add_kids_to_class,
  add_kids_to_class,
  get_kids_parent_list_of_a_class,
  removeKidsFromClass,
  editClass,
};
