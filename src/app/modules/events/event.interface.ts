import { Types } from "mongoose";

export interface IEvent extends Document {
  image?: string | null; // store file path / URL instead of File object in DB
  event_name: string;
  description: string;
  start_date: number; // timestamp in ms
  end_date: number; // timestamp in ms
  start_time: string; // e.g. "09:00"
  end_time: string; // e.g. "15:00"
  class: Types.ObjectId;
  avater_id: string;
}
