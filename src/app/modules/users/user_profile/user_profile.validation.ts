import { z } from "zod";

export const zod_update_profile_schema = z.object({
  body: z
    .object({
      full_name: z.string().optional(),
      nick_name: z.string().optional(),
      date_of_birth: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date)
          return new Date(arg);
      }, z.date().optional()),
      phone: z.string().optional(),
      address: z.string().optional(),
      image: z.string().optional(),
      user: z.string().optional(),
    })
    .strict(),
});
