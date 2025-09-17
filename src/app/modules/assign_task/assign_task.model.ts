import { model, Schema } from "mongoose";
import { ITask, TaskPriority, TaskStatus } from "./assign_task.interface";

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    assign_to: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    assigned_by: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    due_date: { type: Date, required: true },
    due_time: { type: String, required: true },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus), // ✅ reuse enum values
      default: TaskStatus.PENDING,
    },
  },
  { timestamps: true } // automatically add createdAt and updatedAt
);

export const Task = model<ITask>("Task", TaskSchema);
