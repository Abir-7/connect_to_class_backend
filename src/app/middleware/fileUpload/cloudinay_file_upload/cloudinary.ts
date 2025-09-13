import { v2 as cloudinary } from "cloudinary";
import { app_config } from "../../../config";

cloudinary.config({
  cloud_name: app_config.cloudinary.cloud_name,
  api_key: app_config.cloudinary.api_key,
  api_secret: app_config.cloudinary.api_secret,
});

export default cloudinary;
