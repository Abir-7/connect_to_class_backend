/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-shadow */
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import AppError from "../../../errors/AppError";

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  folder: string
): Promise<{ url: string; public_id: string }> => {
  try {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        }
      );
      stream.end(buffer);
    });

    if (!result.secure_url || !result.public_id) {
      throw new AppError(500, "Failed to upload image to Cloudinary");
    }

    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    throw new AppError(500, "Failed to upload image");
  }
};
