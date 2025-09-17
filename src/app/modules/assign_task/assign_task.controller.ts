import status from "http-status";
import catch_async from "../../utils/serverTools/catch_async";
import send_response from "../../utils/serverTools/send_response";
import { AssignTaskService } from "./assign_task.service";
import { Request, Response } from "express";

const assign_task_to_teacher = catch_async(async (req, res) => {
  const result = await AssignTaskService.assign_task_to_teacher(
    req.body,
    req.user.user_id
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Task assign to a teacher successfully.",
    data: result,
  });
});

const tasks_list = catch_async(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const taskStatus = req.query.status as string;
  const search = req.query.search_term as string;

  const { tasks, meta } = await AssignTaskService.tasks_list({
    page,
    limit,
    status: taskStatus,
    search,
  });

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Tasks retrieved successfully.",
    data: tasks,
    meta,
  });
});

const teacher_tasks_list = catch_async(async (req, res) => {
  const result = await AssignTaskService.teacher_tasks_list(
    req.user.user_id,
    req.query.status as string
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Teachers task list fetched.",
    data: result,
  });
});
const update_task_status = catch_async(async (req, res) => {
  const result = await AssignTaskService.update_task_status(
    req.body.task_id,
    req.body.status,
    req.user.user_id
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Teachers task updated.",
    data: result,
  });
});

export const AssignTaskController = {
  assign_task_to_teacher,
  tasks_list,
  teacher_tasks_list,
  update_task_status,
};
