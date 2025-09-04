/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import mongoose from "mongoose";
import KidsClass from "./kids_class.model";

import TeacherClass from "../relational_schema/teacher_class/teacher_class.model";
interface ICreateKidsClassInput {
  class_name: string;
  description: string;
  image?: string;
}

const create_kids_class = async (
  data: ICreateKidsClassInput,
  user_id: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classData = {
      ...data,
      image: data.image || "", // default to empty string if not provided
    };

    const created_class = await KidsClass.create([classData], { session });
    await TeacherClass.create(
      [{ class: created_class[0]._id, teacher: user_id }],
      { session }
    );
    await session.commitTransaction();
    session.endSession();

    return {
      class_id: created_class[0]._id,
      class_name: created_class[0].class_name,
      description: created_class[0].description,
      image: created_class[0].image,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw Error(error as any);
  }
};

export const KidsClassService = { create_kids_class };
