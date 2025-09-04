import { model, Schema } from "mongoose";
import { IClassEvent } from "./class_event.interface";

const ClassEventSchema: Schema<IClassEvent> = new Schema(
  {
    event: { type: Schema.Types.ObjectId, required: true, ref: "Event" },
    class: { type: Schema.Types.ObjectId, required: true, ref: "KidsClass" },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const ClassEvent = model<IClassEvent>("ClassEvent", ClassEventSchema);

export default ClassEvent;
