/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import mongoose from "mongoose";
import { IEvent } from "./event.interface";
import Event from "./event.model";

import AppError from "../../errors/AppError";
import status from "http-status";
import { get_cache, set_cache } from "../../lib/redis/cache";
import TeachersClass from "../teachers_class/teachers_class.model";

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

const create_event = async (data: ICreateEventInput) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const classData = await TeachersClass.findOne({ _id: data.class }).lean();

  if (!classData) {
    throw new AppError(status.NOT_FOUND, "Class data not found.");
  }

  try {
    const eventData: Partial<IEvent> = {
      ...data,
      image: data.image || "",
      avater_id: data.avater_id || "",
      class: data.class as any,
    };

    const createdEvent = await Event.create([eventData], { session });

    await session.commitTransaction();
    session.endSession();

    // Invalidate teacher's event list cache
    const teacherId = classData.teacher.toString();
    await set_cache(`teacher_events:${teacherId}`, null, 0); // clear cache

    return createdEvent[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const get_event_list_of_a_teacher = async (user_id: string) => {
  const cacheKey = `teacher_events:${user_id}`;

  // Step 1: Try to get cached data
  const cachedData = await get_cache<any[]>(cacheKey);
  if (cachedData) {
    return cachedData; // cache hit
  }

  // Step 2: Cache miss → fetch from DB
  const events = await Event.aggregate([
    {
      $lookup: {
        from: "teachersclasses",
        localField: "class",
        foreignField: "_id",
        as: "classInfo",
      },
    },
    { $unwind: "$classInfo" },
    { $match: { "classInfo.teacher": new mongoose.Types.ObjectId(user_id) } },
    {
      $lookup: {
        from: "users",
        localField: "classInfo.teacher",
        foreignField: "_id",
        as: "teacherInfo",
      },
    },
    { $unwind: { path: "$teacherInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "userprofiles",
        localField: "classInfo.teacher",
        foreignField: "user",
        as: "teacherProfile",
      },
    },
    { $unwind: { path: "$teacherProfile", preserveNullAndEmptyArrays: true } },
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
        class: {
          _id: "$classInfo._id",
          class_name: "$classInfo.class_name",
          description: "$classInfo.description",
          image: "$classInfo.image",
          teacher: {
            _id: "$teacherInfo._id",
            email: "$teacherInfo.email",
            role: "$teacherInfo.role",
            full_name: "$teacherProfile.full_name",
            nick_name: "$teacherProfile.nick_name",
            image: "$teacherProfile.image",
          },
        },
      },
    },
  ]);

  // Step 3: Store fresh data in Redis
  await set_cache(cacheKey, events, 60); // TTL 60s (or adjust)

  return events;
};

export const EventService = {
  create_event,
  get_event_list_of_a_teacher,
};
