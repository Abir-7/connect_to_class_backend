import { KidsClass } from "./relational_schema/kids_class.interface.model";
/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import mongoose from "mongoose";
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
import Kids from "../users/users_kids/users_kids.model";
import AppError from "../../errors/AppError";

//import AppError from "../../errors/AppError";

interface ICreateTeachersClassInput {
  class_name: string;
  description: string;
  image?: string;
}

const create_teachers_class = async (
  data: ICreateTeachersClassInput,
  teacherId: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Create the class
    const classData = {
      ...data,
      image: data.image || "",
      teacher: teacherId,
    };
    const created_class = await TeachersClass.create([classData], { session });

    await session.commitTransaction();
    session.endSession();

    // 4️⃣ Clear cache
    const cache_key = `teacher_classes:${teacherId}`;
    await delete_cache(cache_key); // clear cache

    return created_class[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
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

// const add_kids_to_class = async (data: {
//   kids_id: string;
//   parent_id: string;
//   class_id: string;
// }) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // 1️⃣ Add kid to class (always allow multiple entries)
//     const class_kids = await KidsClass.create(
//       [
//         {
//           class: data.class_id,
//           kids_id: data.kids_id,
//         },
//       ],
//       { session }
//     );

//     // 2️⃣ Add parent to class ONLY if not already added
//     let class_parent: any = null;

//     const existingParent = await ParentClass.findOne({
//       class: data.class_id,
//       parent_id: data.parent_id,
//     }).session(session);

//     if (!existingParent) {
//       const createdParent = await ParentClass.create(
//         [
//           {
//             class: data.class_id,
//             parent_id: data.parent_id,
//           },
//         ],
//         { session }
//       );
//       class_parent = createdParent[0];
//     } else {
//       class_parent = existingParent;
//     }

//     await session.commitTransaction();
//     session.endSession();

//     // 3️⃣ Invalidate both kids + parents cache
//     await delete_caches([
//       `class:${data.class_id}:kids`,
//       `class:${data.class_id}:parents`,
//     ]);

//     return {
//       class_kids: class_kids[0],
//       class_parent,
//     };
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };

// const add_kids_to_class_v2 = async (data: {
//   kids_id: string;
//   parent_id: string;
//   class_id: string;
// }) => {
//   const get_parents_all_kids = await Kids.find({ parent: data.parent_id });
//   const kids__all_id = get_parents_all_kids.map((kids) => String(kids._id));

//   if (kids__all_id.length > 1) {
//     const class_list_of_kids = await KidsClass.find({
//       kids_id: { $in: kids__all_id },
//     });

//     const grouped_by_class: Record<string, string[]> = {};
//     class_list_of_kids.forEach((entry) => {
//       const class_id = entry.class.toString();
//       if (!grouped_by_class[class_id]) grouped_by_class[class_id] = [];
//       grouped_by_class[class_id].push(entry.kids_id.toString());
//     });

//     // Kids in the same class (any group with >1 kid)
//     const same_class_groups = Object.values(grouped_by_class).filter(
//       (kids) => kids.length > 1
//     );

//     // Kids in different classes
//     const different_class_groups = Object.values(grouped_by_class).filter(
//       (kids) => kids.length === 1
//     );

//     const in_same_class = same_class_groups.some((group) =>
//       group.some((kid_id) => kid_id === data.kids_id)
//     );

//     // Check in different class groups
//     const in_different_class = different_class_groups.some((group) =>
//       group.some((kid_id) => kid_id === data.kids_id)
//     );

//     if (in_same_class) {
//       logger.info("same class");

//       // throw new AppError(500, "Student already in class");

//       const update_kids_class = await KidsClass.findOneAndUpdate(
//         { kids_id: data.kids_id },
//         { class: data.class_id },
//         { new: true }
//       );

//       const create_parent_class = await ParentClass.create({
//         parent_id: data.parent_id,
//         class: data.class_id,
//       });

//       return {
//         parant_class: create_parent_class.toObject(),
//         kids_class: update_kids_class?.toObject(),
//       };
//     }
//     if (in_different_class) {
//       logger.info("different class");

//       //throw new AppError(500, "Student already in class");

//       const update_kids_class = await KidsClass.findOne({
//         kids_id: data.kids_id,
//       });

//       if (!update_kids_class) {
//         throw new AppError(400, "update_kids_class data not found.");
//       }
//       const update_parent_class = await ParentClass.findOneAndUpdate(
//         { parent_id: data.parent_id, class: update_kids_class?.class },
//         { class: data.class_id },
//         { new: true }
//       );

//       if (!update_parent_class) {
//         throw new AppError(400, "update_parent_class data update not failed.");
//       }

//       update_kids_class.class = data.class_id as any;

//       await update_kids_class.save();

//       return {
//         parant_class: update_parent_class.toObject(),
//         kids_class: update_kids_class?.toObject(),
//       };
//     }
//     return await add_kids_to_class(data);
//   }

//   if (kids__all_id.length === 1 && data.kids_id === kids__all_id[0]) {
//     const is_already_in_class = await KidsClass.findOne({
//       kids_id: kids__all_id[0],
//     });

//     if (is_already_in_class) {
//       // throw new AppError(500, "Student already in class");

//       const update_kids_class = await KidsClass.findOne({
//         kids_id: data.kids_id,
//       });

//       if (!update_kids_class) {
//         throw new AppError(400, "update_kids_class data not found.");
//       }
//       const update_parent_class = await ParentClass.findOneAndUpdate(
//         { parent_id: data.parent_id, class: update_kids_class.class },
//         { class: data.class_id },
//         { new: true }
//       );

//       if (!update_parent_class) {
//         throw new AppError(400, "update_parent_class data update not failed.");
//       }

//       update_kids_class.class = data.class_id as any;

//       await update_kids_class.save();

//       return {
//         parant_class: update_parent_class.toObject(),
//         kids_class: update_kids_class?.toObject(),
//       };
//     }
//     return await add_kids_to_class(data);
//   }
// };

const add_kids_to_class = async (
  data: {
    kids_id: string;
    parent_id: string;
    class_id: string; // target class
  },
  teacher_id: string
) => {
  const isClassValid = await TeachersClass.findOne({
    teacher: teacher_id,
    _id: data.class_id,
  });

  if (!isClassValid) {
    throw new AppError(404, "Class not found.");
  }

  // 1️⃣ Fetch all kids of the parent
  const parentKids = await Kids.find({ parent: data.parent_id }).lean();
  const parentKidsIds = parentKids.map((k) => String(k._id));

  // 2️⃣ Fetch all current class assignments of these kids
  const kidsClasses = await KidsClass.find({
    kids_id: { $in: parentKidsIds },
  }).lean();

  const kidCurrentClass = kidsClasses
    .find((k) => String(k.kids_id) === data.kids_id && k.status === "active")
    ?.class.toString();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 3️⃣ If kid is already in target class → nothing to do
    const existingTargetKidClass = await KidsClass.findOne({
      kids_id: data.kids_id,
      class: data.class_id,
    }).session(session);

    if (existingTargetKidClass?.status === "active") {
      await session.commitTransaction();
      session.endSession();
      const parentClass = await ParentClass.findOne({
        parent_id: data.parent_id,
        class: data.class_id,
      }).lean();
      return {
        parent_class: parentClass,
        kids_class: existingTargetKidClass.toObject(),
      };
    }

    // 4️⃣ Mark old class as leave (if any)
    if (kidCurrentClass && kidCurrentClass !== data.class_id) {
      await KidsClass.updateOne(
        { kids_id: data.kids_id, class: kidCurrentClass },
        { status: "leave" },
        { session }
      );

      // Parent in old class
      const otherActiveKidsInOldClass = kidsClasses.filter(
        (k) =>
          String(k.kids_id) !== data.kids_id &&
          String(k.class) === kidCurrentClass &&
          k.status === "active"
      );

      if (otherActiveKidsInOldClass.length === 0) {
        // No other active kids → parent leave
        await ParentClass.updateOne(
          { parent_id: data.parent_id, class: kidCurrentClass },
          { status: "leave" },
          { session }
        );
      } else {
        // Parent stays active
        await ParentClass.updateOne(
          { parent_id: data.parent_id, class: kidCurrentClass },
          { status: "active" },
          { session }
        );
      }
    }

    // 5️⃣ Upsert target kid-class
    const updatedKidClass = await KidsClass.findOneAndUpdate(
      { kids_id: data.kids_id, class: data.class_id },
      { kids_id: data.kids_id, class: data.class_id, status: "active" },
      { new: true, upsert: true, session }
    );

    // 6️⃣ Upsert target parent-class
    await ParentClass.updateOne(
      { parent_id: data.parent_id, class: data.class_id },
      { parent_id: data.parent_id, class: data.class_id, status: "active" },
      { upsert: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    // 7️⃣ Invalidate caches
    const affectedClassIds = new Set<string>();

    if (kidCurrentClass) affectedClassIds.add(kidCurrentClass);
    if (data.class_id) affectedClassIds.add(data.class_id);

    await delete_caches(
      Array.from(affectedClassIds).flatMap((classId) => [
        `class:${classId}:kids`,
        `class:${classId}:parents`,
      ])
    );

    const parentClass = await ParentClass.findOne({
      parent_id: data.parent_id,
      class: data.class_id,
    }).lean();

    return {
      parent_class: parentClass,
      kids_class: updatedKidClass.toObject(),
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
          status: 1,
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
  // add_kids_to_class,
  add_kids_to_class,
  get_kids_parent_list_of_a_class,
};
