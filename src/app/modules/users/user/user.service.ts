/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UserProfile } from "../user_profile/user_profile.model";

const get_my_data = async (userId: string) => {
  const user = await UserProfile.findOne({ user: userId }).populate("PARENT");
  return user;
};

export const UserService = {
  get_my_data,
};
