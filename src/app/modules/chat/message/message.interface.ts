import { Types } from "mongoose";

export interface IMessage extends Document {
  chat: Types.ObjectId; // reference to ChatRoom
  sender: Types.ObjectId; // sender user
  text: string; // message text
  createdAt?: Date;
  updatedAt?: Date;
}
