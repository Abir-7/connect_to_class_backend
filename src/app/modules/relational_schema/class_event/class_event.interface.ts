import { Types } from "mongoose";

export interface IClassEvent {
  event: Types.ObjectId;
  class: Types.ObjectId;
}
