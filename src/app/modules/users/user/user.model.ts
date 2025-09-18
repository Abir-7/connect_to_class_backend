/* eslint-disable @typescript-eslint/no-unused-vars */

import { model, Schema } from "mongoose";
import { IUser } from "./user.interface";

import bcrypt from "bcryptjs";
import { user_role } from "../../../interface/auth.interface";
const user_schema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: user_role, // adjust roles according to TUserRole
    },
    password: {
      type: String,
      required: true,
    },
    authentication: {
      expires_at: {
        type: Date,
        default: null,
      },
      otp: {
        type: Number,
        default: null,
      },
      token: {
        type: String,
        default: null,
      },
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    need_to_reset_password: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

user_schema.methods.comparePassword = async function (
  entered_password: string
) {
  try {
    return await bcrypt.compare(entered_password, this.password);
  } catch (error) {
    throw new Error("Error comparing password");
  }
};

const User = model<IUser>("User", user_schema);

export default User;
