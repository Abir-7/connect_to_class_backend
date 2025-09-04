import { z } from "zod";

export const zod_kids_class_schema = z.object({
  body: z.object({
    class_name: z.string(),
    description: z.string(),
  }),
});
