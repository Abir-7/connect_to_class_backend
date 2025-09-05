/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import mongoose from "mongoose";
import { IEvent } from "./event.interface";
import Event from "./event.model";

import KidsClass from "../kids_class/kids_class.model";
import AppError from "../../errors/AppError";
import status from "http-status";
import ClassEventTeacher from "../relational_schema/class_teacher_event/class_event.model";

interface ICreateEventInput {
  photo?: string;
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

  const classData = await KidsClass.findOne({ _id: data.class }).lean();

  if (!classData) {
    throw new AppError(status.NOT_FOUND, "Class data not found.");
  }

  try {
    const eventData: Partial<IEvent> = {
      ...data,
      photo: data.photo || "",
      avater_id: data.avater_id || "",
      class: new mongoose.Types.ObjectId(data.class),
    };

    const createdEvent = await Event.create([eventData], { session });

    await ClassEventTeacher.create(
      [
        {
          event: createdEvent[0]._id,
          class: new mongoose.Types.ObjectId(data.class),
          teacher: user_id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      _id: createdEvent[0]._id,
      event_name: createdEvent[0].event_name,
      description: createdEvent[0].description,
      start_date: createdEvent[0].start_date,
      end_date: createdEvent[0].end_date,
      start_time: createdEvent[0].start_time,
      end_time: createdEvent[0].end_time,
      class: createdEvent[0].class,
      photo: createdEvent[0].photo,
      avater_id: createdEvent[0].avater_id,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const get_event_list_of_a_teacher = async (user_id: string) => {
  const event_list = await ClassEventTeacher.find({
    teacher: user_id,
  })
    .populate({
      path: "event",
      select: "-class", // 👈 remove class reference from event
    })
    .populate({
      path: "class",
      select: "class_name description _id", // 👈 only these fields
    })
    .select("event class -_id");
  return event_list;
};

export const EventService = {
  create_event,
  get_event_list_of_a_teacher,
};
