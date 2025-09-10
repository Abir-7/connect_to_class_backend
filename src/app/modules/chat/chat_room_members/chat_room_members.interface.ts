import { Types } from "mongoose";

export const chat_member_type = ["teacher", "parent"] as const;
export type ChatMemberType = (typeof chat_member_type)[number];

export interface IChatRoomMember extends Document {
  chat: Types.ObjectId;
  user: Types.ObjectId;
  type: ChatMemberType;
  createdAt?: Date;
  updatedAt?: Date;
}
