import { Schema, model } from "mongoose";
import { IUserProfile } from "./user_profile.interface";

const userProfileSchema = new Schema<IUserProfile>({
  full_name: { type: String, default: "" },
  nick_name: { type: String, default: "" },
  date_of_birth: { type: Date, default: null },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  image: { type: String, default: "" },
  user: { type: Schema.Types.ObjectId, ref: "User", unique: true },
  image_id: { type: String, default: "" },
});

export const UserProfile = model<IUserProfile>(
  "UserProfile",
  userProfileSchema
);
