/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import mongoose from "mongoose";
import { IEvent } from "./event.interface";
import Event from "./event.model";

import AppError from "../../errors/AppError";
import status from "http-status";
import { delete_cache, get_cache, set_cache } from "../../lib/redis/cache";
import TeachersClass from "../teachers_class/teachers_class.model";
import { ParentClass } from "../teachers_class/relational_schema/parent_class.interface.model";
import { app_config } from "../../config";
import unlink_file from "../../middleware/fileUpload/multer_file_storage/unlink_files";

interface ICreateEventInput {
  image?: string;
  event_name: string;
  description: string;
  start_date: number; // timestamp in ms
  end_date: number; // timestamp in ms
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  class: string; // class ObjectId as string
  avater_id?: string;
}

const create_event = async (data: ICreateEventInput, user_id: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  if (data.class?.length > 0) {
    const classData = await TeachersClass.findOne({ _id: data.class }).lean();

    if (!classData) {
      throw new AppError(status.NOT_FOUND, "Class data not found.");
    }
  }

  try {
    const eventData: Partial<IEvent> = {
      ...data,
      image: data.image ? `${app_config.server.baseurl}${data.image}` : "",
      avater_id: data.avater_id || "",
      ...(data.class?.length > 0 ? { class: data.class as any } : {}),
      created_by: user_id as any,
    };

    const createdEvent = await Event.create([eventData], { session });

    await session.commitTransaction();
    session.endSession();

    // Invalidate teacher's event list cache

    await delete_cache(`teacher_events:${user_id}`); // clear cache

    let parentIds: string[] = [];

    if (data.class) {
      // Event for a specific class → only parents of that class
      parentIds = (
        await ParentClass.find({ class: data.class }).distinct("parent_id")
      ).map((id: mongoose.Types.ObjectId) => id.toString());
    } else {
      parentIds = (await ParentClass.find({}).distinct("parent_id")).map(
        (id: mongoose.Types.ObjectId) => id.toString()
      );
    }

    const cachePromises = parentIds.map((pid) =>
      delete_cache(`parent_events:${pid.toString()}`)
    );
    await Promise.all(cachePromises);

    return createdEvent[0];
  } catch (error) {
    if (data.image) {
      unlink_file(data.image);
    }
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const get_event_list_of_a_teacher = async (user_id: string) => {
  const cacheKey = `teacher_events:${user_id}`;

  // Try cache first
  const cachedData = await get_cache<any[]>(cacheKey);
  if (cachedData) return cachedData;

  const events = await Event.aggregate([
    // Always match events created by teacher OR with no class
    {
      $match: {
        $or: [
          { created_by: new mongoose.Types.ObjectId(user_id) },
          { class: { $exists: false } },
          { class: null },
        ],
      },
    },
    // Lookup class info if class exists
    {
      $lookup: {
        from: "teachersclasses",
        localField: "class",
        foreignField: "_id",
        as: "classInfo",
      },
    },
    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
    // Lookup class teacher info if class exists
    {
      $lookup: {
        from: "users",
        localField: "classInfo.teacher",
        foreignField: "_id",
        as: "classTeacherInfo",
      },
    },
    {
      $unwind: { path: "$classTeacherInfo", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "userprofiles",
        localField: "classInfo.teacher",
        foreignField: "user",
        as: "classTeacherProfile",
      },
    },
    {
      $unwind: {
        path: "$classTeacherProfile",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup event creator profile (always)
    {
      $lookup: {
        from: "userprofiles",
        localField: "created_by",
        foreignField: "user",
        as: "teacherProfile",
      },
    },
    { $unwind: { path: "$teacherProfile", preserveNullAndEmptyArrays: true } },
    // Project final shape
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
        avater_id: 1,
        teacher: {
          _id: "$created_by",
          full_name: "$teacherProfile.full_name",
          nick_name: "$teacherProfile.nick_name",
          image: "$teacherProfile.image",
        },
        class: {
          $cond: {
            if: { $gt: [{ $type: "$classInfo" }, "missing"] },
            then: {
              _id: "$classInfo._id",
              class_name: "$classInfo.class_name",
              description: "$classInfo.description",
              image: "$classInfo.image",
            },
            else: null,
          },
        },
      },
    },
  ]);

  // Cache and return
  await set_cache(cacheKey, events, 60);
  return events;
};

const get_event_list_for_parent = async (parent_id: string) => {
  const cacheKey = `parent_events:${parent_id}`;

  // Step 1: Check cache
  const cachedData = await get_cache<any[]>(cacheKey);
  if (cachedData) return cachedData;

  // Step 2: Get class IDs the parent is enrolled in
  const parentClasses = await mongoose
    .model("ParentClass")
    .find({ parent_id: parent_id })
    .select("class")
    .lean();

  const classIds = parentClasses.map((c) => c.class);

  // Step 3: Aggregate events
  const events = await Event.aggregate([
    {
      $match: {
        $or: [
          { class: { $in: classIds } }, // events for parent's classes
          { class: null }, // events with no class
        ],
      },
    },
    // Lookup class info if exists
    {
      $lookup: {
        from: "teachersclasses",
        localField: "class",
        foreignField: "_id",
        as: "classInfo",
      },
    },
    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
    // Lookup teacher info from event creator
    {
      $lookup: {
        from: "userprofiles",
        localField: "created_by",
        foreignField: "user",
        as: "teacherProfile",
      },
    },
    { $unwind: { path: "$teacherProfile", preserveNullAndEmptyArrays: true } },
    // Project final shape
    {
      $project: {
        _id: 1,
        image: 1,
        event_name: 1,
        description: 1,
        start_date: 1,
        end_date: 1,
        start_time: 1,
        end_time: 1,
        avater_id: 1,
        teacher: {
          _id: "$created_by",
          full_name: "$teacherProfile.full_name",
          nick_name: "$teacherProfile.nick_name",
          image: "$teacherProfile.image",
        },
        class: {
          $cond: {
            if: { $gt: [{ $type: "$classInfo" }, "missing"] },
            then: {
              _id: "$classInfo._id",
              class_name: "$classInfo.class_name",
              description: "$classInfo.description",
              image: "$classInfo.image",
            },
            else: null,
          },
        },
      },
    },
  ]);

  // Step 4: Cache and return
  await set_cache(cacheKey, events, 60);
  return events;
};

export const EventService = {
  create_event,
  get_event_list_of_a_teacher,
  get_event_list_for_parent,
};
