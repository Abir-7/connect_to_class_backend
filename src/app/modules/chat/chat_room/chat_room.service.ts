/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Types } from "mongoose";

import { user_roles } from "../../../interface/auth.interface";

import ChatRoom from "./chat_room.model";
import { ParentClass } from "../../teachers_class/relational_schema/parent_class.interface.model";

const get_user_chat_list = async (
  userId: string,
  role: keyof typeof user_roles
) => {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");
  const userObjectId = new Types.ObjectId(userId);

  let matchStage: any = {};

  if (role === user_roles.PARENT) {
    // Only active classes
    const activeClasses = await ParentClass.find({
      parent_id: userObjectId,
      status: "active",
    }).select("class");

    const activeClassIds = activeClasses.map((c) => c.class);

    matchStage = {
      $or: [
        {
          type: { $in: ["group", "teacher_only"] },
          class: { $in: activeClassIds },
        },
        { type: "individual" },
      ],
    };
  } else if (role === user_roles.TEACHER) {
    matchStage = {
      $or: [{ type: { $in: ["group", "teacher_only", "individual"] } }],
    };
  }

  const chats = await ChatRoom.aggregate([
    { $match: matchStage },

    // Join members
    {
      $lookup: {
        from: "chatroommembers",
        localField: "_id",
        foreignField: "chat",
        as: "members",
      },
    },

    { $match: { "members.user": userObjectId } },

    // Lookup Users
    {
      $lookup: {
        from: "users",
        localField: "members.user",
        foreignField: "_id",
        as: "memberUsers",
      },
    },

    // Lookup UserProfiles
    {
      $lookup: {
        from: "userprofiles",
        localField: "memberUsers._id",
        foreignField: "user",
        as: "profiles",
      },
    },

    // Lookup TeachersClass (strip _id, createdAt, updatedAt, __v)
    {
      $lookup: {
        from: "teachersclasses",
        let: { classId: "$class" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$classId"] } } },
          {
            $project: {
              _id: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ],
        as: "class_details",
      },
    },

    {
      $addFields: {
        // single user object instead of array
        other_user: {
          $cond: [
            { $eq: ["$type", "individual"] },
            {
              $let: {
                vars: {
                  targetUser: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$memberUsers",
                          as: "u",
                          cond: { $ne: ["$$u._id", userObjectId] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  _id: "$$targetUser._id",
                  email: "$$targetUser.email",
                  role: "$$targetUser.role",
                  profile: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$profiles",
                          as: "p",
                          cond: { $eq: ["$$p.user", "$$targetUser._id"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
            null,
          ],
        },
        class_details: { $arrayElemAt: ["$class_details", 0] },
      },
    },

    {
      $project: {
        members: 0,
        memberUsers: 0,
        profiles: 0,
      },
    },
  ]);

  return chats;
};

export const ChatRoomService = {
  get_user_chat_list,
};
