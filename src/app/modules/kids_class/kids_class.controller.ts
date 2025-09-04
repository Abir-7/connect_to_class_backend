import status from "http-status";
import catch_async from "../../utils/serverTools/catch_async";
import send_response from "../../utils/serverTools/send_response";
import { KidsClassService } from "./kids_class.service";
import { get_relative_path } from "../../middleware/fileUpload/get_relative_path";

const create_kids_class = catch_async(async (req, res) => {
  const filePath = req.file?.path;

  const class_data = {
    ...req.body,
    ...(filePath && { image: get_relative_path(filePath) }),
  };
  const result = await KidsClassService.create_kids_class(
    class_data,
    req.user.user_id
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Class  successfully created.",
    data: result,
  });
});

export const KidsClassController = {
  create_kids_class,
};
