/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import mongoose from "mongoose";
import { get_date_range } from "../../helperFunction/general/get_date_range";
import User from "../users/user/user.model";
import Kids from "../users/users_kids/users_kids.model";
import TeachersClass from "../teachers_class/teachers_class.model";
import Event from "../events/event.model";
import { ParentClass } from "../teachers_class/relational_schema/parent_class.interface.model";
import { KidsClass } from "../teachers_class/relational_schema/kids_class.interface.model";

const overview_recent_user = async (
  type: "last_7_days" | "last_month",
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
        role: { $ne: "ADMIN" }, // skip admins
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
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
              role: { $ne: "ADMIN" }, // skip admins if role exists in kids
            },
          },
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
  const now = new Date();

  // Current counts
  const [teachers, parents, students] = await Promise.all([
    User.countDocuments({ role: "TEACHER" }),
    User.countDocuments({ role: "PARENT" }),
    Kids.countDocuments({}),
  ]);

  // Last month date range
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999
  );

  // Last month counts
  const [teachersLast, parentsLast, studentsLast] = await Promise.all([
    User.countDocuments({
      role: "TEACHER",
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
    User.countDocuments({
      role: "PARENT",
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
    Kids.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
  ]);

  // Helper to calculate growth
  const calcGrowth = (current: number, previous: number) =>
    previous === 0
      ? "N/A"
      : Math.round(((current - previous) / previous) * 100);

  // Return everything as a single array
  const overviewArray = [
    {
      type: "teachers",
      count: teachers,
      growth: calcGrowth(teachers, teachersLast),
    },
    {
      type: "parents",
      count: parents,
      growth: calcGrowth(parents, parentsLast),
    },
    {
      type: "students",
      count: students,
      growth: calcGrowth(students, studentsLast),
    },
  ];

  return overviewArray;
};

const get_all_users = async (
  role?: string,
  search?: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;
  const searchRegex = search ? new RegExp(search, "i") : null;

  const pipeline: any[] = [
    // USERS PIPELINE
    {
      $match:
        role === "STUDENT"
          ? { _id: null }
          : role === "ALL"
          ? { role: { $ne: "ADMIN" } }
          : { role },
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
    ...(search
      ? [
          {
            $match: {
              $or: [
                { email: searchRegex },
                { "profile.full_name": searchRegex },
              ],
            },
          },
        ]
      : []),
    {
      $project: {
        _id: 1,
        email: 1,
        role: 1,
        full_name: { $ifNull: ["$profile.full_name", "N/A"] },
        nick_name: { $ifNull: ["$profile.nick_name", "N/A"] },
        date_of_birth: {
          $ifNull: [
            {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$profile.date_of_birth",
              },
            },
            "N/A",
          ],
        },
        phone: { $ifNull: ["$profile.phone", "N/A"] },
        address: { $ifNull: ["$profile.address", "N/A"] },
        image: { $ifNull: ["$profile.image", "N/A"] },
        avatar_id: { $literal: "N/A" },
        gender: { $literal: "N/A" },
      },
    },

    // KIDS PIPELINE
    {
      $unionWith: {
        coll: "kids",
        pipeline: [
          {
            $match:
              role === "STUDENT" || role === "ALL" || !role
                ? searchRegex
                  ? { full_name: searchRegex }
                  : {}
                : { _id: null },
          },
          {
            $project: {
              _id: 1,
              email: { $literal: "N/A" },
              role: { $literal: "STUDENT" },
              full_name: { $ifNull: ["$full_name", "N/A"] },
              nick_name: { $literal: "N/A" },
              date_of_birth: { $literal: "N/A" },
              phone: { $literal: "N/A" },
              address: { $literal: "N/A" },
              image: { $ifNull: ["$image", "N/A"] },
              avatar_id: { $ifNull: ["$avatar_id", "N/A"] },
              gender: { $ifNull: ["$gender", "N/A"] },
              parent: "$parent",
            },
          },
        ],
      },
    },

    // SORT + PAGINATION
    { $sort: { _id: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  const data = await User.aggregate(pipeline);

  const [countResult] = await User.aggregate([
    ...pipeline.filter((stage) => !("$skip" in stage || "$limit" in stage)),
    { $count: "total" },
  ]);

  const total_item = countResult?.total || 0;

  const meta = {
    total_item,
    total_page: Math.ceil(total_item / limit),
    limit,
    page,
  };

  return { meta, data };
};

const get_all_class_list = async (
  search?: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;

  const pipeline: any[] = [
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
        localField: "teacherInfo._id",
        foreignField: "user",
        as: "profileInfo",
      },
    },
    { $unwind: { path: "$profileInfo", preserveNullAndEmptyArrays: true } },
  ];

  // 🔎 Search filter
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { class_name: { $regex: search, $options: "i" } },
          { "teacherInfo.email": { $regex: search, $options: "i" } },
          { "profileInfo.full_name": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  // ✅ Count total documents
  const countPipeline = [...pipeline, { $count: "total" }];
  const totalResult = await TeachersClass.aggregate(countPipeline);
  const total_item = totalResult.length > 0 ? totalResult[0].total : 0;
  const total_page = Math.ceil(total_item / limit);

  // ✅ Paginated data
  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        class_name: 1,
        description: 1,
        image: 1,
        createdAt: 1,
        updatedAt: 1,

        teacher_id: "$teacherInfo._id",
        teacher_email: "$teacherInfo.email",
        teacher_role: "$teacherInfo.role",
        teacher_is_verified: "$teacherInfo.is_verified",

        profile_full_name: "$profileInfo.full_name",
        profile_nick_name: "$profileInfo.nick_name",
        profile_dob: "$profileInfo.date_of_birth",
        profile_phone: "$profileInfo.phone",
        profile_address: "$profileInfo.address",
        profile_image: "$profileInfo.image",
      },
    }
  );

  const class_list = await TeachersClass.aggregate(pipeline);

  return {
    meta: {
      total_item,
      total_page,
      limit,
      page,
    },
    data: class_list,
  };
};

const get_class_members = async (
  classId: string,
  role: "student" | "parent",
  page = 1,
  limit = 10,
  search = ""
) => {
  const objectId = new mongoose.Types.ObjectId(classId);

  let basePipeline: any[] = [];

  if (role === "student") {
    basePipeline = [
      { $match: { class: objectId } },
      {
        $lookup: {
          from: "kids",
          localField: "kids_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $lookup: {
          from: "users",
          localField: "student.user",
          foreignField: "_id",
          as: "studentUser",
        },
      },
      { $unwind: { path: "$studentUser", preserveNullAndEmptyArrays: true } },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "student.full_name": { $regex: search, $options: "i" } },
                  { "studentUser.email": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: "$student._id",
          full_name: "$student.full_name",
          email: "$studentUser.email",
          role: { $literal: "student" },
          image: "$student.image",
        },
      },
    ];

    const pipeline = [
      ...basePipeline,
      {
        $facet: {
          docs: [
            { $sort: { full_name: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await KidsClass.aggregate(pipeline);
    const docs = result[0]?.docs || [];
    const total_item = result[0]?.totalCount[0]?.count || 0;
    const total_page = Math.ceil(total_item / limit);

    return {
      data: docs,
      meta: { total_item, total_page, page, limit },
    };
  }

  if (role === "parent") {
    basePipeline = [
      { $match: { class: objectId } },
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
          localField: "parent._id",
          foreignField: "user",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "profile.full_name": { $regex: search, $options: "i" } },
                  { "parent.email": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: "$parent._id",
          full_name: "$profile.full_name",
          email: "$parent.email",
          role: { $literal: "parent" },
          image: "$profile.image",
        },
      },
    ];

    const pipeline = [
      ...basePipeline,
      {
        $facet: {
          docs: [
            { $sort: { full_name: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await ParentClass.aggregate(pipeline);
    const docs = result[0]?.docs || [];
    const total_item = result[0]?.totalCount[0]?.count || 0;
    const total_page = Math.ceil(total_item / limit);

    return {
      data: docs,
      meta: { total_item, total_page, page, limit },
    };
  }

  return {
    data: [],
    meta: { total_item: 0, total_page: 0, page: 1, limit: 10 },
  };
};

const get_teacher_info_of_class = async (classId: string) => {
  const objectId = new mongoose.Types.ObjectId(classId);
  console.log(classId);
  const pipeline = [
    { $match: { _id: objectId } },
    {
      $lookup: {
        from: "users",
        localField: "teacher",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $lookup: {
        from: "userprofiles",
        localField: "userInfo._id",
        foreignField: "user",
        as: "profileInfo",
      },
    },
    { $unwind: { path: "$profileInfo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: "$userInfo._id",
        email: "$userInfo.email",
        role: { $literal: "teacher" },
        name: "$profileInfo.full_name",
        image: "$profileInfo.image",
        class_name: "$class_name",
        class_id: "$_id",
      },
    },
  ];

  const result = await TeachersClass.aggregate(pipeline);
  return result[0] || null;
};

const get_all_event_list = async (
  filter: "upcoming" | "completed" | "all" = "all",
  search?: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;
  const now = Date.now();

  const pipeline: any[] = [
    // Join with class
    {
      $lookup: {
        from: "teachersclasses",
        localField: "class",
        foreignField: "_id",
        as: "classInfo",
      },
    },
    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

    // Join with user
    {
      $lookup: {
        from: "users",
        localField: "created_by",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },

    // Join with user profile
    {
      $lookup: {
        from: "userprofiles",
        localField: "userInfo._id",
        foreignField: "user",
        as: "profileInfo",
      },
    },
    { $unwind: { path: "$profileInfo", preserveNullAndEmptyArrays: true } },
  ];

  // 🔎 Search filter
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { event_name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { "classInfo.class_name": { $regex: search, $options: "i" } },
          { "userInfo.email": { $regex: search, $options: "i" } },
          { "profileInfo.full_name": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  // 🕒 Status filter
  if (filter === "upcoming") {
    pipeline.push({ $match: { end_date: { $gte: now } } });
  } else if (filter === "completed") {
    pipeline.push({ $match: { end_date: { $lt: now } } });
  }

  // ✅ Count total
  const countPipeline = [...pipeline, { $count: "total" }];
  const totalResult = await Event.aggregate(countPipeline);
  const total_item = totalResult.length > 0 ? totalResult[0].total : 0;
  const total_page = Math.ceil(total_item / limit);

  // ✅ Paginated data
  pipeline.push(
    { $sort: { start_date: 1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        event_name: 1,
        description: 1,
        image: 1,
        start_date: 1,
        end_date: 1,
        start_time: 1,
        end_time: 1,
        createdAt: 1,
        updatedAt: 1,

        // 👇 Class handling
        class_id: "$classInfo._id",
        class_name: {
          $ifNull: ["$classInfo.class_name", "For All"],
        },

        user_id: "$userInfo._id",
        user_email: "$userInfo.email",
        user_role: "$userInfo.role",
        user_verified: "$userInfo.is_verified",

        profile_full_name: "$profileInfo.full_name",
        profile_nick_name: "$profileInfo.nick_name",
        profile_dob: "$profileInfo.date_of_birth",
        profile_phone: "$profileInfo.phone",
        profile_address: "$profileInfo.address",
        profile_image: "$profileInfo.image",
      },
    }
  );

  const events = await Event.aggregate(pipeline);

  return {
    meta: {
      total_item,
      total_page,
      limit,
      page,
    },
    data: events,
  };
};

export default get_all_event_list;

export const DashboardService = {
  overview_get_total_users,
  overview_recent_user,
  get_all_users,
  get_all_class_list,
  get_teacher_info_of_class,
  get_class_members,
  get_all_event_list,
};
