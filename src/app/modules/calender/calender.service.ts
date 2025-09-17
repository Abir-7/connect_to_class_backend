/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from "googleapis";
import { authorize } from "../../lib/google/googleAuth";
import logger from "../../utils/serverTools/logger";

const add_calendar_event = async (title: string, date: string) => {
  const auth = (await authorize()) as any;
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: title,
    start: { date }, // YYYY-MM-DD for all-day
    end: { date }, // required
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  logger.info("✅ Event created:", response.data.htmlLink);
  return "Success";
};

export const CalenderService = {
  add_calendar_event,
};
