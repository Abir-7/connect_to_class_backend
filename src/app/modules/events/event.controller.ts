import status from "http-status";
import { get_relative_path } from "../../middleware/fileUpload/get_relative_path";
import catch_async from "../../utils/serverTools/catch_async";
import send_response from "../../utils/serverTools/send_response";
import { EventService } from "./event.service";

const create_event = catch_async(async (req, res) => {
  const filePath = req.file?.path;

  const event_data = {
    ...req.body,
    ...(filePath && { image: get_relative_path(filePath) }),
  };
  const result = await EventService.create_event(event_data);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Event  successfully created.",
    data: result,
  });
});

const get_event_list_of_a_teacher = catch_async(async (req, res) => {
  const result = await EventService.get_event_list_of_a_teacher(
    req.user.user_id
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Event list  successfully fetched",
    data: result,
  });
});

export const EventController = {
  create_event,
  get_event_list_of_a_teacher,
};
