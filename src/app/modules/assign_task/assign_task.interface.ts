import { Types } from "mongoose";

export interface ITask extends Document {
  title: string;
  description: string;
  assign_to: Types.ObjectId;
  assigned_by: Types.ObjectId;
  due_date: Date;
  due_time: string;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
  status: TaskStatus;
}

export enum TaskStatus {
  PENDING = "pending",
  ONGOING = "ongoing",
  COMPLETED = "completed",
}
export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}
