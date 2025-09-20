/* eslint-disable @typescript-eslint/no-unused-vars */
import path from "path";
import AppError from "../../../errors/AppError";
import unlink_file from "../multer_file_storage/unlink_files";
import cloudinary from "./cloudinary";

export const uploadFileToCloudinary = async (
  filePath: string,
  folder: string
): Promise<{ url: string; public_id: string }> => {
  try {
    const absolutePath = path.join(process.cwd(), "uploads", filePath);
    const result = await cloudinary.uploader.upload(absolutePath, {
      folder,
      resource_type: "auto",
      chunk_size: 6000000,
    });
    unlink_file(filePath);

    if (!result.secure_url || !result.public_id) {
      throw new Error("Failed to upload file to Cloudinary");
    }

    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    throw new AppError(500, "Failed to upload image");
  }
};
