/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { get_cache, set_cache } from "../../../lib/redis/cache";
import { UserProfile } from "../user_profile/user_profile.model";

const CACHE_TTL = 60 * 120; // 5 minutes

const get_my_data = async (userId: string) => {
  const cacheKey = `user_profile:${userId}`;
  const cachedData = await get_cache<any>(cacheKey);
  if (cachedData) return cachedData;

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

  const result = {
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

  set_cache(cacheKey, result, CACHE_TTL).catch(() => {});

  return result;
};
export const UserService = {
  get_my_data,
};
