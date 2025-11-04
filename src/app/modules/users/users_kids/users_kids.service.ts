/* eslint-disable arrow-body-style */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import status from "http-status";
import AppError from "../../../errors/AppError";
import { remove_falsy_fields } from "../../../utils/helper/remove_falsy_field";

import { IKids } from "./users_kids.interface";
import Kids from "./users_kids.model";
import { KidsProgressReport } from "../kids_progress_report/kids_progress_report.schema";

import mongoose from "mongoose";
import unlink_file from "../../../middleware/fileUpload/multer_file_storage/unlink_files";
import { KidsClass } from "../../teachers_class/relational_schema/kids_class.interface.model";

const add_users_kids = async (userdata: Partial<IKids>) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const data = remove_falsy_fields(userdata);

    // Create kid document inside transaction
    const created_kids = await Kids.create([data], { session });

    if (!created_kids || !created_kids[0]) {
      throw new AppError(status.BAD_REQUEST, "Failed to add user's kid.");
    }

    // Create progress report linked to the kid
    await KidsProgressReport.create([{ kids_id: created_kids[0]._id }], {
      session,
    });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return created_kids[0];
  } catch (err) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const get_kids_by_parent = async (parentId: string) => {
  return await Kids.find({ parent: parentId }).lean();
};

const edit_kids_by_parent = async (
  kid_id: string,
  kid_data: Partial<IKids>
) => {
  const get_kid = await Kids.findOne({ _id: kid_id }).lean();

  if (!get_kid) {
    throw new AppError(404, "Kid not found.");
  }

  const old = get_kid.image_id;

  const data = await Kids.findByIdAndUpdate(kid_id, kid_data, {
    new: true,
  });

  if (kid_data.image_id && old) {
    unlink_file(old);
  }

  if (!data && kid_data.image_id) {
    unlink_file(kid_data.image_id);
  }

  if (!data) {
    throw new AppError(400, "Failed to update kid");
  }
  return data;
};

const deleteKid = async (kidId: string) => {
  const kid_data = await Kids.findOne({ _id: kidId }).lean();
  if (!kid_data) {
    throw new AppError(404, "Kid not found.");
  }
  const old = kid_data.image_id;

  if (old) {
    unlink_file(old);
  }
  await KidsClass.deleteOne({ kids_id: kidId });
  await KidsProgressReport.deleteOne({ kids_id: kidId });
  return await Kids.findOneAndDelete({ _id: kidId });
};

export const UserKidsService = {
  add_users_kids,
  get_kids_by_parent,
  edit_kids_by_parent,
  deleteKid,
};
