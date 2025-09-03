import { Schema, model } from "mongoose";
import { Gender, IKids } from "./users_kids.interface";

const kids_schema = new Schema<IKids>(
  {
    parent: { type: Schema.Types.ObjectId, ref: "parent", required: true },
    gender: { type: String, enum: Object.values(Gender), required: true },
    full_name: { type: String, required: true },
    image: { type: String, default: "" },
    avatar_id: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Kids = model<IKids>("kids", kids_schema); // collection name in lowercase

export default Kids;
