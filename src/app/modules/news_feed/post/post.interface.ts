import { Document, Types } from "mongoose";

export interface IPost extends Document {
  files: { url: string; public_id: string; type: IMediaType }[];
  description: string;
  teacher: Types.ObjectId;
}
export enum IMediaType {
  IMAGE = "image",
  VIDEO = "video",
}
