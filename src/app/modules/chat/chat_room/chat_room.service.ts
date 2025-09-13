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

// const get_user_chat_list = async (
//   userId: string,
//   role: keyof typeof user_roles
// ) => {
//   if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");
//   const userObjectId = new Types.ObjectId(userId);

//   let matchStage: any = {};

//   if (role === user_roles.PARENT) {
//     // Only active classes
//     const activeClasses = await ParentClass.find({
//       parent_id: userObjectId,
//       status: "active",
//     }).select("class");

//     const activeClassIds = activeClasses.map((c) => c.class);

//     matchStage = {
//       $or: [
//         {
//           type: { $in: ["group", "teacher_only"] },
//           class: { $in: activeClassIds },
//         },
//         { type: "individual" },
//       ],
//     };
//   } else if (role === user_roles.TEACHER) {
//     matchStage = {
//       $or: [{ type: { $in: ["group", "teacher_only", "individual"] } }],
//     };
//   }

//   const chats = await ChatRoom.aggregate([
//     { $match: matchStage },

//     // Join members
//     {
//       $lookup: {
//         from: "chatroommembers",
//         localField: "_id",
//         foreignField: "chat",
//         as: "members",
//       },
//     },
//     { $match: { "members.user": userObjectId } },

//     // Lookup Users
//     {
//       $lookup: {
//         from: "users",
//         localField: "members.user",
//         foreignField: "_id",
//         as: "memberUsers",
//       },
//     },

//     // Lookup UserProfiles
//     {
//       $lookup: {
//         from: "userprofiles",
//         localField: "memberUsers._id",
//         foreignField: "user",
//         as: "profiles",
//       },
//     },

//     // Lookup TeachersClass
//     {
//       $lookup: {
//         from: "teachersclasses",
//         let: { classId: "$class" },
//         pipeline: [
//           { $match: { $expr: { $eq: ["$_id", "$$classId"] } } },
//           { $project: { _id: 0, createdAt: 0, updatedAt: 0, __v: 0 } },
//         ],
//         as: "class_details",
//       },
//     },

//     // Lookup lastMessage with sender and profile
//     {
//       $lookup: {
//         from: "messages",
//         localField: "lastMessage",
//         foreignField: "_id",
//         as: "lastMessageDetails",
//       },
//     },
//     {
//       $unwind: {
//         path: "$lastMessageDetails",
//         preserveNullAndEmptyArrays: true,
//       },
//     },

//     // Lookup sender user
//     {
//       $lookup: {
//         from: "users",
//         localField: "lastMessageDetails.sender",
//         foreignField: "_id",
//         as: "lastMessageSender",
//       },
//     },
//     {
//       $unwind: { path: "$lastMessageSender", preserveNullAndEmptyArrays: true },
//     },

//     // Lookup sender profile
//     {
//       $lookup: {
//         from: "userprofiles",
//         localField: "lastMessageSender._id",
//         foreignField: "user",
//         as: "lastMessageSenderProfile",
//       },
//     },

//     // Add fields with plain objects
//     {
//       $addFields: {
//         lastMessage: {
//           $cond: [
//             { $ifNull: ["$lastMessageDetails", false] },
//             {
//               _id: "$lastMessageDetails._id",
//               text: "$lastMessageDetails.text",
//               image: "$lastMessageDetails.image",
//               createdAt: "$lastMessageDetails.createdAt",
//               updatedAt: "$lastMessageDetails.updatedAt",
//               sender: {
//                 $mergeObjects: [
//                   {
//                     _id: "$lastMessageSender._id",
//                     email: "$lastMessageSender.email",
//                     role: "$lastMessageSender.role",
//                   },
//                   {
//                     $arrayElemAt: [
//                       {
//                         $map: {
//                           input: { $ifNull: ["$lastMessageSenderProfile", []] },
//                           as: "p",
//                           in: {
//                             full_name: "$$p.full_name",
//                             nick_name: "$$p.nick_name",
//                             date_of_birth: "$$p.date_of_birth",
//                             phone: "$$p.phone",
//                             address: "$$p.address",
//                             image: "$$p.image",
//                           },
//                         },
//                       },
//                       0,
//                     ],
//                   },
//                 ],
//               },
//             },
//             null,
//           ],
//         },
//       },
//     },

//     {
//       $project: {
//         members: 0,
//         memberUsers: 0,
//         profiles: 0,
//         lastMessageDetails: 0,
//         lastMessageSender: 0,
//         lastMessageSenderProfile: 0,
//       },
//     },
//   ]);

//   return chats;
// };

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

    // Lookup last message
    {
      $lookup: {
        from: "messages",
        localField: "lastMessage",
        foreignField: "_id",
        as: "last_message",
      },
    },
    {
      $unwind: {
        path: "$last_message",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Project out unwanted fields (only exclusions, expressions handled above)
    {
      $project: {
        members: 0,
        "last_message._id": 0,
        "last_message.chat": 0,
        "last_message.updatedAt": 0,
        "last_message.__v": 0,
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
    const chat_data = await ChatRoom.findById(chat);

    if (!chat_data) {
      throw new AppError(404, "Chat data not found");
    }

    // Upload all images to Cloudinary
    const uploadedImages = await Promise.all(
      images.map(async (filePath) => {
        // Resolve absolute path

        const result = await uploadFileToCloudinary(filePath, "images");
        return result.url;
      })
    );

    // Save message to DB (uncomment if needed)

    const saved_message = await Message.create({
      chat,
      text: message || "",
      image: uploadedImages, // store uploaded URLs
      sender: user_id,
    });

    if (uploadedImages.length > 0) {
      images.map((link) => unlink_file(link));
    }

    chat_data.lastMessage = saved_message._id;
    await chat_data.save();
    return saved_message.toObject();

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
