/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import catch_async from "../../utils/serverTools/catch_async";
import send_response from "../../utils/serverTools/send_response";
import { TeachersClassService } from "./teachers_class.service";
import { get_relative_path } from "../../middleware/fileUpload/multer_file_storage/get_relative_path";

const create_teachers_class = catch_async(async (req, res) => {
  const filePath = req.file?.path;

  const class_data = {
    ...req.body,
    ...(filePath && { image: get_relative_path(filePath) }),
  };
  const result = await TeachersClassService.create_teachers_class(
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

const get_my_class = catch_async(async (req, res) => {
  const result = await TeachersClassService.get_my_class(req.user.user_id);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Class list of a teacher successfully fetched.",
    data: result,
  });
});

const search_users = catch_async(async (req, res) => {
  const result = await TeachersClassService.search_users(
    req.query.search_term as string
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Searched parent data is fetched.",
    data: result,
  });
});

const add_kids_to_class = catch_async(async (req, res) => {
  const result = await TeachersClassService.add_kids_to_class(
    req.body,
    req.user.user_id
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Kids and parent added to class.",
    data: result,
  });
});

const get_kids_parent_list_of_a_class = catch_async(async (req, res) => {
  const result = await TeachersClassService.get_kids_parent_list_of_a_class(
    req.params.class_id,
    req.query.member_type as any
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Kids and parent added to class.",
    data: result,
  });
});

const removeKidsFromClass = catch_async(async (req, res) => {
  const result = await TeachersClassService.removeKidsFromClass(
    req.params.class_id,
    req.query.kids_id as any
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Kids and parent added to class.",
    data: result,
  });
});

export const TeachersClassController = {
  create_teachers_class,
  get_my_class,
  search_users,
  add_kids_to_class,
  get_kids_parent_list_of_a_class,
  removeKidsFromClass,
};
