import { z } from "zod";

export const zodcreate_userSchema = z.object({
  body: z
    .object({
      fullName: z.string(),
      email: z.string().email(),
      password: z.string(),
    })
    .strict(),
});
