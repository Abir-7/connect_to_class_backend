/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import status from "http-status";
import AppError from "../../../errors/AppError";
import { get_relative_path } from "../../../middleware/fileUpload/multer_file_storage/get_relative_path";
import User from "../user/user.model";
import unlink_file from "../../../middleware/fileUpload/multer_file_storage/unlink_files";
import { UserProfile } from "./user_profile.model";
import { IUserProfile } from "./user_profile.interface";
import { remove_falsy_fields } from "../../../utils/helper/remove_falsy_field";
import { delete_cache } from "../../../lib/redis/cache";
import { uploadFileToCloudinary } from "../../../middleware/fileUpload/cloudinay_file_upload/cloudinaryUpload";

import { publish_job } from "../../../lib/rabbitMq/publisher";

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

  // Get existing profile to know old image
  const existingProfile = await UserProfile.findOne({ user: user_id });

  let cloud_image: { url: string; public_id: string } = {
    url: existingProfile?.image || "",
    public_id: existingProfile?.image_id || "",
  };

  // If new image is provided
  if (data.image) {
    // 1. Upload new image
    const newImage = await uploadFileToCloudinary(data.image, "profile");
    cloud_image = newImage;

    // 2. Delete old image only if it exists
    if (existingProfile?.image_id) {
      await publish_job("delete_image_queue", {
        public_id: existingProfile.image_id,
      });
    }
  }

  // Update profile with new data
  const updated = await UserProfile.findOneAndUpdate(
    { user: user_id },
    { ...data, image: cloud_image.url, image_id: cloud_image.public_id },
    { new: true }
  );

  if (!updated) {
    throw new AppError(status.BAD_REQUEST, "Failed to update user info.");
  }

  delete_cache(`user_profile:${user_id}`).catch(() => {});
  return updated;
};

export const UserProfileService = {
  update_profile_data,
  update_profile_image,
  update_profile,
};
