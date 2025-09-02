import { Schema, model } from "mongoose";
import { IUserProfile } from "./user_profile.interface";

const userProfileSchema = new Schema<IUserProfile>({
  full_name: { type: String },
  nickname: { type: String },
  date_of_birth: { type: Date },
  phone: { type: String },
  address: { type: String },
  image: { type: String },
  user: { type: Schema.Types.ObjectId, ref: "User", unique: true },
});

export const UserProfile = model<IUserProfile>(
  "UserProfile",
  userProfileSchema
);
