import { model, Schema } from "mongoose";
import { IClass } from "./kids_class.interface";

const kids_class_schema: Schema<IClass> = new Schema(
  {
    class_name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, default: "" }, // can be URL
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const KidsClass = model<IClass>("KidsClass", kids_class_schema);

export default KidsClass;
