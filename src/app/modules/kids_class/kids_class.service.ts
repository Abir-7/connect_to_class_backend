/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { get_cache, set_cache } from "../../lib/redis/cache";
import KidsClass from "./kids_class.model";

interface ICreateKidsClassInput {
  class_name: string;
  description: string;
  image?: string;
}

const create_kids_class = async (
  data: ICreateKidsClassInput,
  user_id: string
) => {
  const class_data = {
    ...data,
    image: data.image || "",
    teacher: user_id,
  };

  const created_class = await KidsClass.create(class_data);

  const cache_key = `teacher_classes:${user_id}`;
  await set_cache(cache_key, null, 0); // clear cache

  return created_class;
};

const get_my_class = async (user_id: string) => {
  const cache_key = `teacher_classes:${user_id}`;

  const cachedData = await get_cache<any[]>(cache_key);
  if (cachedData) return cachedData;

  const class_list = await KidsClass.find({ teacher: user_id }).lean();

  await set_cache(cache_key, class_list, 3600);

  return class_list;
};

export const KidsClassService = { create_kids_class, get_my_class };
