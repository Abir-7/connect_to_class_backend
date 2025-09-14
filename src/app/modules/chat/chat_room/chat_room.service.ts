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
import unlink_file from "../../../middleware/fileUpload/unlink_files";
import path from "path";

const get_user_chat_list = async (
  userId: string,
  role: keyof typeof user_roles
) => {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");
  const userObjectId = new Types.ObjectId(userId);

  let matchStage: any = {};

  if (role === user_roles.PARENT) {
    // Only active classes for parents
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

    // Join chat members
    {
      $lookup: {
        from: "chatroommembers",
        localField: "_id",
        foreignField: "chat",
        as: "members",
      },
    },
    { $match: { "members.user": userObjectId } },

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

    // Convert class_details array to object or null
    {
      $addFields: {
        class_details: {
          $ifNull: [{ $arrayElemAt: ["$class_details", 0] }, null],
        },
      },
    },

    // Lookup last message (only needed fields)
    {
      $lookup: {
        from: "messages",
        let: { lastMsgId: "$last_message" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$lastMsgId"] } } },
          {
            $project: {
              _id: 0,
              chat: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ],
        as: "last_message",
      },
    },

    // Flatten last_message array → object or null
    {
      $addFields: {
        last_message: {
          $ifNull: [{ $arrayElemAt: ["$last_message", 0] }, null],
        },
      },
    },

    // Clean up fields
    {
      $project: {
        members: 0,
      },
    },
  ]);

  return chats;
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

export const send_image = async (
  images: string[],
  message: string,
  chat: string,
  user_id: string
) => {
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

    // Save message using helper
    const saved_message = await saveMessage({
      chat,
      sender: user_id,
      text: message,
      images: uploadedImages, // [] if no images
    });

    // Cleanup local temp files
    if (images?.length > 0) {
      images.map((link) => unlink_file(link));
    }

    return saved_message;
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
export const saveMessage = async ({
  chat,
  sender,
  text = "",
  images = [],
}: {
  chat: string;
  sender: string;
  text?: string;
  images?: string[]; // optional
}) => {
  try {
    const chat_data = await ChatRoom.findById(chat);

    if (!chat_data) {
      throw new AppError(404, "Chat not found");
    }

    // Create and save message
    const saved_message = await Message.create({
      chat,
      sender,
      text,
      image: images?.length > 0 ? images : [], // default empty array
    });

    // Update last_message in chat
    chat_data.last_message = saved_message._id;
    await chat_data.save();

    return saved_message;
  } catch (err) {
    throw new AppError(500, "Failed to save message");
  }
};
