/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import mongoose, { Types } from "mongoose";

import { user_roles } from "../../../interface/auth.interface";

import ChatRoom from "./chat_room.model";
import { ParentClass } from "../../teachers_class/relational_schema/parent_class.interface.model";
import { Message } from "../message/message.model";
import { uploadFileToCloudinary } from "../../../middleware/fileUpload/cloudinay_file_upload/cloudinaryUpload";
import AppError from "../../../errors/AppError";
import unlink_file from "../../../middleware/fileUpload/multer_file_storage/unlink_files";
import path from "path";

const get_user_chat_list = async (
  userId: string,
  role: keyof typeof user_roles,
  page = 1,
  limit = 20
) => {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");
  const userObjectId = new Types.ObjectId(userId);

  let matchStage: any = {};

  if (role === user_roles.PARENT) {
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

  // 🔹 First aggregate to count total items (after filtering for membership)
  const totalAgg = await ChatRoom.aggregate([
    { $match: matchStage },
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
        as: "member_info",
      },
    },
    { $match: { "member_info.0": { $exists: true } } },
    { $count: "total_item" },
  ]);

  const total_item = totalAgg[0]?.total_item || 0;

  // 🔹 Then fetch paginated data
  const chats = await ChatRoom.aggregate([
    { $match: matchStage },

    // Join chat members (current user)
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
        as: "member_info",
      },
    },
    { $match: { "member_info.0": { $exists: true } } },

    // Lookup class details
    {
      $lookup: {
        from: "teachersclasses",
        let: { classId: "$class" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$classId"] } } },
          { $project: { _id: 0, createdAt: 0, updatedAt: 0, __v: 0 } },
        ],
        as: "class_details",
      },
    },
    {
      $addFields: {
        class_details: {
          $ifNull: [{ $arrayElemAt: ["$class_details", 0] }, null],
        },
      },
    },

    // Lookup last message
    {
      $lookup: {
        from: "messages",
        let: { lastMsgId: "$last_message" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$lastMsgId"] } } },
          { $project: { _id: 0, chat: 0, updatedAt: 0, __v: 0 } },
        ],
        as: "last_message",
      },
    },
    {
      $addFields: {
        last_message: {
          $ifNull: [{ $arrayElemAt: ["$last_message", 0] }, null],
        },
      },
    },

    // Count unread messages
    {
      $lookup: {
        from: "messages",
        let: {
          chatId: "$_id",
          lastRead: { $arrayElemAt: ["$member_info.last_read_at", 0] },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$chat", "$$chatId"] },
                  {
                    $gt: [
                      "$createdAt",
                      { $ifNull: ["$$lastRead", new Date(0)] },
                    ],
                  },
                ],
              },
            },
          },
          { $count: "unread_count" },
        ],
        as: "unread",
      },
    },
    {
      $addFields: {
        total_unread: {
          $ifNull: [{ $arrayElemAt: ["$unread.unread_count", 0] }, 0],
        },
      },
    },

    // Lookup other user only for individual chats
    {
      $lookup: {
        from: "chatroommembers",
        let: { chatId: "$_id", chatType: "$type" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$chat", "$$chatId"] },
                  { $ne: ["$user", userObjectId] },
                  { $eq: ["$$chatType", "individual"] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "user_info",
            },
          },
          {
            $lookup: {
              from: "userprofiles",
              localField: "user",
              foreignField: "user",
              as: "profile",
            },
          },
          {
            $addFields: {
              user_info: { $arrayElemAt: ["$user_info", 0] },
              profile: { $arrayElemAt: ["$profile", 0] },
            },
          },
          {
            $project: {
              _id: 0,
              user: "$user_info._id",
              email: "$user_info.email",
              full_name: "$profile.full_name",
              image: "$profile.image",
            },
          },
        ],
        as: "other_user",
      },
    },
    {
      $addFields: {
        other_user: { $arrayElemAt: ["$other_user", 0] },
      },
    },

    // Clean up fields
    { $project: { members: 0, member_info: 0, unread: 0 } },

    // 🔹 Pagination
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);

  const meta = {
    total_item,
    total_page: Math.ceil(total_item / limit),
    page,
    limit,
  };

  const processedData = chats.map((chat) => {
    if (chat.type === "group") {
      return {
        sender: chat.class_details?.class_name || "",
        sender_image: chat.class_details?.image || "",
        last_message: chat.last_message?.text || "",
        last_message_image: chat.last_message?.image || [],
        sending_time: chat.last_message?.createdAt || null,
        total_unread: chat.total_unread,
      };
    }

    if (chat.type === "teacher_only") {
      return {
        sender: chat.class_details?.class_name || "",
        sender_image: chat.class_details?.image || "",
        last_message: chat.last_message?.text || "",
        last_message_image: chat.last_message?.image || [],
        sending_time: chat.last_message?.createdAt || null,
        total_unread: chat.total_unread,
      };
    }

    if (chat.type === "individual") {
      return {
        sender: chat.other_user.full_name || "",
        sender_image: chat.other_user?.image || "",
        last_message: chat.last_message?.text || "",
        last_message_image: chat.last_message?.image || [],
        sending_time: chat.last_message?.createdAt || null,
        total_unread: chat.total_unread,
      };
    }
  });

  return { data: processedData, meta };
};

const get_message_data = async (chatId: string, page = 1, limit = 50) => {
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new Error("Invalid chat ID");
  }

  const skip = (page - 1) * limit;

  const messages = await Message.aggregate([
    { $match: { chat: new mongoose.Types.ObjectId(chatId) } },
    { $sort: { createdAt: -1 } }, // latest messages first
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "sender",
      },
    },
    { $unwind: "$sender" },
    {
      $lookup: {
        from: "userprofiles",
        localField: "sender._id",
        foreignField: "user",
        as: "profile",
      },
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        // chat: 1,
        text: 1,
        image: 1,
        createdAt: 1,
        //  updatedAt: 1,
        sender: {
          _id: "$sender._id",
          // email: "$sender.email",
          //  role: "$sender.role",

          full_name: "$profile.full_name",
          // nick_name: "$profile.nick_name",
          image: "$profile.image",
          //  phone: "$profile.phone",
        },
      },
    },
  ]);

  const total_item = await Message.countDocuments({ chat: chatId });

  const meta = {
    total_item,
    total_page: Math.ceil(total_item / limit),
    limit,
    page,
  };

  return { messages, meta };
};

export const send_image = async (images: string[]) => {
  try {
    let uploadedImages: string[] = [];

    if (images && images.length > 0) {
      // Upload images to Cloudinary
      uploadedImages = await Promise.all(
        images.map(async (filePath) => {
          const result = await uploadFileToCloudinary(filePath, "images");
          return result.url;
        })
      );
    }

    if (images?.length > 0) {
      images.map((link) => unlink_file(link));
    }

    return uploadedImages;
  } catch (error) {
    if (images?.length > 0) {
      images.map((link) => unlink_file(link));
    }
    throw new AppError(500, "Failed to send image message");
  }
};

export const ChatRoomService = {
  get_user_chat_list,
  get_message_data,
  send_image,
};

/**
 * Save a message in DB and update chat last_message
 */
