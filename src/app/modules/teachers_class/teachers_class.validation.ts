import { z } from "zod";

export const zod_teachers_class_schema = z.object({
  body: z.object({
    class_name: z.string(),
    description: z.string(),
  }),
});
