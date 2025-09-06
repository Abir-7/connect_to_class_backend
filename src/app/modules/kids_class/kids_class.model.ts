import { model, Schema } from "mongoose";
import { IClass } from "./kids_class.interface";

const kids_class_schema: Schema<IClass> = new Schema(
  {
    class_name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, default: "" },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const KidsClass = model<IClass>("KidsClass", kids_class_schema);

export default KidsClass;
