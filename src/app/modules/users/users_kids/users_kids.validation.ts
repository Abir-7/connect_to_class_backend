import z from "zod";

export const zod_kids_schema = z.object({
  body: z.object({
    gender: z.enum(["male", "female", "other"]),
    full_name: z.string().min(1, "Full name is required"),
    avatar_id: z.string().min(1, "Avatar ID is required").optional(),
  }),
});
