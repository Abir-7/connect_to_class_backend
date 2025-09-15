/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UserProfile } from "../user_profile/user_profile.model";

const get_my_data = async (userId: string) => {
  const userProfile = await UserProfile.findOne({ user: userId })
    .populate("user")
    .lean(); // convert to plain JS object

  if (!userProfile) return null;

  const {
    _id: profileId,
    full_name,
    nick_name,
    date_of_birth,
    phone,
    address,
    image,
  } = userProfile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { _id: user_id, email, role } = (userProfile.user as any) || {};

  return {
    _id: user_id,
    email,
    role,
    full_name,
    nick_name,
    date_of_birth,
    phone,
    address,
    image,
  };
};
export const UserService = {
  get_my_data,
};
