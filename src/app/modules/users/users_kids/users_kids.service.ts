/* eslint-disable arrow-body-style */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import status from "http-status";
import AppError from "../../../errors/AppError";
import { remove_falsy_fields } from "../../../utils/helper/remove_falsy_field";

import { IKids } from "./users_kids.interface";
import Kids from "./users_kids.model";

const add_users_kids = async (userdata: Partial<IKids>) => {
  const data = remove_falsy_fields(userdata);
  const created_kids = await Kids.create(data);

  if (!created_kids) {
    throw new AppError(status.BAD_REQUEST, "Failed to add users kid.");
  }
  return created_kids;
};

const get_kids_by_parent = async (parentId: string) => {
  return await Kids.find({ parent: parentId }).lean();
};
export const UserKidsService = {
  add_users_kids,
  get_kids_by_parent,
};
