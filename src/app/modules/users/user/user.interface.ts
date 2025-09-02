import { Document } from "mongoose";
import { TUserRole } from "../../../interface/auth.interface";

export interface IBaseUser {
  email: string;
  role: TUserRole;
  password: string;
  authentication: {
    expires_at: Date | null;
    otp: number | null;
    token: string | null;
  };
  is_verified: boolean;
  need_to_reset_password: boolean;
}

export interface IUser extends IBaseUser, Document {
  comparePassword(entered_password: string): Promise<boolean>;
}
