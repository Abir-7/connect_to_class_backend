import { z } from "zod";
import { user_role } from "../../interface/auth.interface";

export const zodcreate_userSchema = z.object({
  body: z
    .object({
      full_name: z.string(),
      email: z.string().email(),
      password: z.string(),
      role: z.enum([...user_role] as [string, ...string[]]),
    })
    .strict(),
});
