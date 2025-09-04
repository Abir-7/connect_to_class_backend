import { z } from "zod";

export const zod_event_schema = z.object({
  body: z.object({
    photo: z.string().optional(),
    event_name: z.string().min(1, "Event name is required"),
    description: z.string().min(1, "Description is required"),
    start_date: z
      .number()
      .int()
      .positive("Start date must be a timestamp in ms"),
    end_date: z.number().int().positive("End date must be a timestamp in ms"),
    start_time: z
      .string()
      .regex(
        /^([0-1]\d|2[0-3]):([0-5]\d)$/,
        "Start time must be in HH:mm format"
      ),
    end_time: z
      .string()
      .regex(
        /^([0-1]\d|2[0-3]):([0-5]\d)$/,
        "End time must be in HH:mm format"
      ),
    class: z.string().min(1, "Class ID is required"),
    avater_id: z.string().optional(),
  }),
});
