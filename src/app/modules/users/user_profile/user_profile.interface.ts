import { Types } from "mongoose";

export interface IUserProfile extends Document {
  full_name: string;
  nick_name?: string;
  date_of_birth?: Date;
  phone?: string;
  address?: string;
  image?: string;
  user: Types.ObjectId;
  image_id: string;
}
