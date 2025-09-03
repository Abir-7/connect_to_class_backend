/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import status from "http-status";
import AppError from "../../../errors/AppError";
import { get_relative_path } from "../../../middleware/fileUpload/get_relative_path";
import User from "../user/user.model";
import unlink_file from "../../../middleware/fileUpload/unlink_files";
import { UserProfile } from "./user_profile.model";
import { IUserProfile } from "./user_profile.interface";
import { remove_falsy_fields } from "../../../utils/helper/remove_falsy_field";

const update_profile_image = async (path: string, email: string) => {
  const user = await User.findOne({ email: email });

  const image = get_relative_path(path);

  if (!image) {
    throw new AppError(status.NOT_FOUND, "Image not found.");
  }

  if (!user) {
    unlink_file(image);

    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  const user_profile = await UserProfile.findOne({ user: user.id });

  if (!user_profile) {
    unlink_file(image);
    throw new AppError(status.NOT_FOUND, "User profile not found.");
  }

  user_profile.image = image;

  const saved_data = await user_profile.save();

  if (!saved_data) {
    unlink_file(image);
    throw new AppError(status.BAD_REQUEST, "Failed to update image.");
  }

  if (user_profile && user_profile.image) {
    unlink_file(user_profile.image);
  }
  return saved_data;
};

const update_profile_data = async (
  user_data: Partial<IUserProfile>,
  email: string
): Promise<IUserProfile | null> => {
  const user = await User.findOne({ email: email });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }
  const data = remove_falsy_fields(user_data);
  const updated = await UserProfile.findOneAndUpdate({ user: user._id }, data, {
    new: true,
  });

  if (!updated) {
    throw new AppError(status.BAD_REQUEST, "Failed to update user info.");
  }

  return updated;
};

const update_profile = async (
  userdata: Partial<IUserProfile>,
  user_id: string
): Promise<IUserProfile | null> => {
  const data = remove_falsy_fields(userdata);
  const updated = await UserProfile.findOneAndUpdate({ user: user_id }, data, {
    new: true,
  });

  if (!updated) {
    throw new AppError(status.BAD_REQUEST, "Failed to update user info.");
  }
  return updated;
};

export const UserProfileService = {
  update_profile_data,
  update_profile_image,
  update_profile,
};
