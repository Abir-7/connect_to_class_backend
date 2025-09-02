import { Types } from "mongoose";

export interface IUserProfile {
  full_name: string;
  nickname?: string;
  date_of_birth?: Date;
  phone?: string;
  address?: string;
  image?: string;
  user: Types.ObjectId;
}
