import { z } from "zod";

export const zod_update_profile_schema = z.object({
  body: z
    .object({
      fullName: z.string().optional(),
      nickname: z.string().optional(),
      dateOfBirth: z.preprocess((arg) => {
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
