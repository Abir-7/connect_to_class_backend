import status from "http-status";
import catch_async from "../../utils/serverTools/catch_async";
import send_response from "../../utils/serverTools/send_response";
import { CalenderService } from "./calender.service";

const add_calendar_event = catch_async(async (req, res) => {
  const { title, date } = req.body;
  const result = await CalenderService.add_calendar_event(title, date);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Event added to calender",
    data: result,
  });
});

export const CalenderController = {
  add_calendar_event,
};
