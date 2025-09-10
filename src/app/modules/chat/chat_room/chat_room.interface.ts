import { Types } from "mongoose";

export const chatTypes = ["group", "teacher_only", "individual"] as const;
export type ChatType = (typeof chatTypes)[number];

export interface IChatRoom extends Document {
  class?: Types.ObjectId;
  type: ChatType;
  lastMessage?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
