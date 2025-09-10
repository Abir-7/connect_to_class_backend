/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Types } from "mongoose";

import { ParentClass } from "../../teachers_class/relational_schema/parent_class.interface.model";
import { TUserRole } from "../../../interface/auth.interface";
import ChatRoom from "./chat_room.model";

const get_user_chat_list = async (userId: string, role: TUserRole) => {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");
  const userObjectId = new Types.ObjectId(userId);

  let parentActiveClassIds: Types.ObjectId[] = [];

  if (role === "PARENT") {
    // Only active parent-class relationships
    const activeParentClasses = await ParentClass.find({
      parent_id: userObjectId,
      status: "active",
    }).lean();
    parentActiveClassIds = activeParentClasses.map((c) => c.class);
  }

  const chats = await ChatRoom.aggregate([
    // Membership lookup
    {
      $lookup: {
        from: "chatroommembers",
        let: { chatId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$chat", "$$chatId"] },
                  { $eq: ["$user", userObjectId] },
                ],
              },
            },
          },
        ],
        as: "membership",
      },
    },
    // Include chat if:
    // - Parent: active class OR
    // - Teacher OR individual where user is member
    {
      $match: {
        $or: [
          ...(role === "PARENT"
            ? [{ class: { $in: parentActiveClassIds } }]
            : []),
          { "membership.0": { $exists: true } },
        ],
      },
    },
    // Populate last message sender
    {
      $lookup: {
        from: "users",
        localField: "lastMessage.sender",
        foreignField: "_id",
        as: "lastMessageSender",
      },
    },
    {
      $addFields: {
        lastMessageSenderName: {
          $arrayElemAt: ["$lastMessageSender.full_name", 0],
        },
      },
    },
    // Only for individual: get other user info
    {
      $lookup: {
        from: "chatroommembers",
        let: { chatId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$chat", "$$chatId"] } } },
          { $project: { user: 1 } },
        ],
        as: "membersData",
      },
    },
    {
      $addFields: {
        otherUserId: {
          $cond: [
            { $eq: ["$type", "individual"] },
            {
              $let: {
                vars: {
                  filtered: {
                    $filter: {
                      input: "$membersData.user",
                      as: "member",
                      cond: { $ne: ["$$member", userObjectId] },
                    },
                  },
                },
                in: { $arrayElemAt: ["$$filtered", 0] },
              },
            },
            null,
          ],
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "otherUserId",
        foreignField: "_id",
        as: "otherUserInfo",
      },
    },
    {
      $lookup: {
        from: "userprofiles",
        localField: "otherUserId",
        foreignField: "user",
        as: "otherUserProfile",
      },
    },
    // Populate class info for group chats
    {
      $lookup: {
        from: "teachersclasses",
        localField: "class",
        foreignField: "_id",
        as: "classInfo",
      },
    },
    {
      $addFields: {
        otherUser: {
          $cond: [
            { $eq: ["$type", "individual"] },
            {
              _id: { $arrayElemAt: ["$otherUserInfo._id", 0] },
              email: { $arrayElemAt: ["$otherUserInfo.email", 0] },
              role: { $arrayElemAt: ["$otherUserInfo.role", 0] },
              full_name: { $arrayElemAt: ["$otherUserProfile.full_name", 0] },
              image: { $arrayElemAt: ["$otherUserProfile.image", 0] },
            },
            null,
          ],
        },
        classInfo: { $arrayElemAt: ["$classInfo", 0] },
      },
    },
    { $sort: { "lastMessage.createdAt": -1 } },
  ]);

  return chats;
};
export const ChatRoomService = {
  get_user_chat_list,
};
