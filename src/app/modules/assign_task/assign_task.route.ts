import { Router } from "express";
import { auth } from "../../middleware/auth/auth";
import { AssignTaskController } from "./assign_task.controller";

const router = Router();

router.post(
  "/add-task",
  auth("ADMIN"),
  AssignTaskController.assign_task_to_teacher
);

router.get("/all-task", auth("ADMIN"), AssignTaskController.tasks_list);

router.get(
  "/get-my-task",
  auth("TEACHER"),
  AssignTaskController.teacher_tasks_list
);

router.patch(
  "/update-status",
  auth("TEACHER"),
  AssignTaskController.update_task_status
);

export const TaskRoute = router;
