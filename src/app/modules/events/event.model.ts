import { Schema, model } from "mongoose";
import { IEvent } from "./event.interface";
const event_schema = new Schema<IEvent>(
  {
    image: { type: String, default: "" },
    event_name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    start_date: { type: Number, required: true },
    end_date: { type: Number, required: true },
    start_time: { type: String, required: true }, // "HH:mm"
    end_time: { type: String, required: true },
    class: {
      type: Schema.Types.ObjectId,
      ref: "KidsClass",
      required: true,
      index: true,
    },
    avater_id: { type: String, default: "" },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const Event = model<IEvent>("Event", event_schema);

export default Event;
