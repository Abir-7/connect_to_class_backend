/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Types } from "mongoose";
import { TaskStatus } from "./assign_task.interface";
import { Task } from "./assign_task.model";

const assign_task_to_teacher = async (data: any, user_id: string) => {
  const saved_task = await Task.create({ ...data, assigned_by: user_id });

  return saved_task;
};

interface IListTaskParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string; // search by task title or teacher name
}

const tasks_list = async ({
  page = 1,
  limit = 10,
  status,
  search,
}: IListTaskParams) => {
  const match: any = {};
  console.log(status, "-------------");
  // Filter by status
  if (status) {
    if (status === TaskStatus.COMPLETED) {
      const now = new Date();
      const threeDaysAgo = now.getTime() - 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

      match.status = TaskStatus.COMPLETED;
      match.updatedAt = { $gte: threeDaysAgo };
    } else if (status === TaskStatus.ONGOING) {
      match.status = { $in: [TaskStatus.ONGOING] };
    } else if (status === TaskStatus.PENDING) {
      match.status = { $in: [TaskStatus.PENDING] };
    }
  }

  const skip = (page - 1) * limit;

  const tasks = await Task.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "assign_to",
        foreignField: "_id",
        as: "assign_to",
      },
    },
    { $unwind: "$assign_to" },
    {
      $lookup: {
        from: "userprofiles",
        localField: "assign_to._id",
        foreignField: "user",
        as: "assign_to_profile",
      },
    },
    {
      $unwind: { path: "$assign_to_profile", preserveNullAndEmptyArrays: true },
    },
    {
      $addFields: {
        "assign_to.full_name": "$assign_to_profile.full_name",
        "assign_to.nick_name": "$assign_to_profile.nick_name",
        "assign_to.date_of_birth": "$assign_to_profile.date_of_birth",
        "assign_to.phone": "$assign_to_profile.phone",
        "assign_to.address": "$assign_to_profile.address",
        "assign_to.image": "$assign_to_profile.image",
      },
    },
    // Search filter
    ...(search
      ? [
          {
            $match: {
              $or: [
                { title: { $regex: search, $options: "i" } },
                { "assign_to.email": { $regex: search, $options: "i" } },
                { "assign_to.full_name": { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
      : []),
    {
      $project: {
        title: 1,
        description: 1,
        due_date: 1,
        due_time: 1,
        priority: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        "assign_to._id": 1,
        "assign_to.email": 1,
        "assign_to.role": 1,
        "assign_to.full_name": 1,
        "assign_to.nick_name": 1,
        "assign_to.date_of_birth": 1,
        "assign_to.phone": 1,
        "assign_to.address": 1,
        "assign_to.image": 1,
      },
    },
    { $sort: { due_date: 1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  const total_item = await Task.countDocuments(match);
  const total_page = Math.ceil(total_item / limit);

  return { tasks, meta: { total_item, total_page, limit, page } };
};

const teacher_tasks_list = async (
  teacherId: string,
  status: string = "all"
) => {
  const now = new Date();
  const threeDaysAgo = now.getTime() - 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

  let orFilter: any[] = [];

  if (status === "all") {
    // All tasks: pending, ongoing, completed
    orFilter = [
      { status: TaskStatus.PENDING },
      { status: TaskStatus.ONGOING },
      { status: TaskStatus.COMPLETED, updatedAt: { $gte: threeDaysAgo } },
    ];
  } else if (status === TaskStatus.COMPLETED) {
    // Only completed tasks from last 3 days
    orFilter = [
      { status: TaskStatus.COMPLETED, updatedAt: { $gte: threeDaysAgo } },
    ];
  } else if (
    [TaskStatus.PENDING, TaskStatus.ONGOING].includes(status as TaskStatus)
  ) {
    orFilter = [{ status }];
  } else {
    throw new Error("Invalid status filter");
  }

  const tasks = await Task.find({
    assign_to: new Types.ObjectId(teacherId),
    $or: orFilter,
  }).sort({ due_date: 1 });

  return tasks;
};

const update_task_status = async (
  task_id: string,
  newStatus: TaskStatus,
  user_id: string
) => {
  // Find the task

  console.log(task_id, user_id);
  const task = await Task.findOne({ _id: task_id, assign_to: user_id });
  if (!task) {
    throw new Error("Task not found");
  }

  // Prevent updating a task that's already completed
  if (task.status === TaskStatus.COMPLETED) {
    throw new Error("Cannot update a task that is already completed");
  }

  // Validate status transition
  const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.PENDING]: [TaskStatus.ONGOING, TaskStatus.COMPLETED],
    [TaskStatus.ONGOING]: [TaskStatus.COMPLETED],
    [TaskStatus.COMPLETED]: [], // Already handled above
  };

  if (!allowedTransitions[task.status].includes(newStatus)) {
    throw new Error(
      `Invalid status transition from ${task.status} to ${newStatus}`
    );
  }

  // Update status
  task.status = newStatus;
  await task.save();

  return task;
};

export const AssignTaskService = {
  assign_task_to_teacher,
  tasks_list,
  teacher_tasks_list,
  update_task_status,
};
