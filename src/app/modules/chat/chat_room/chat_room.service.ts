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
        _id: 1,
        chat: 1,
        text: 1,
        image: 1,
        createdAt: 1,
        updatedAt: 1,
        sender: {
          _id: "$sender._id",
          email: "$sender.email",
          role: "$sender.role",

          full_name: "$profile.full_name",
          nick_name: "$profile.nick_name",
          image: "$profile.image",
          phone: "$profile.phone",
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

const send_image = async (
  images: string[],
  message: string,
  chat: string,
  user_id: string
) => {
  try {
    // Upload all images to Cloudinary
    const uploadedImages = await Promise.all(
      images.map(async (filePath) => {
        // Resolve absolute path

        const result = await uploadFileToCloudinary(filePath, "images");
        return result.url;
      })
    );

    // Save message to DB (uncomment if needed)

    const savedMessage = await Message.create({
      chat,
      text: message || "",
      image: uploadedImages, // store uploaded URLs
      sender: user_id,
    });

    if (uploadedImages.length > 0) {
      images.map((link) => unlink_file(link));
    }

    return savedMessage.toObject();

    //return uploadedImages; // return array of uploaded URLs
  } catch (error) {
    images.map((link) => unlink_file(link));
    throw new AppError(500, "Failed to upload images");
  }
};

export const ChatRoomService = {
  get_user_chat_list,
  get_message_data,
  send_image,
};
