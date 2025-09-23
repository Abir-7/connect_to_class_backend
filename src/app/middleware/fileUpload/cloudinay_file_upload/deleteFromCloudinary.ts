import logger from "../../../utils/serverTools/logger";
import cloudinary from "./cloudinary";

/**
 * Delete a file from Cloudinary by its public_id
 * @param public_id - The public_id of the file to delete
 */
export const deleteFileFromCloudinary = async (
  public_id: string
): Promise<void> => {
  if (!public_id) return; // nothing to delete

  try {
    const result = await cloudinary.uploader.destroy(public_id);
    if (result.result !== "ok" && result.result !== "not found") {
      logger.warn(`Unexpected Cloudinary deletion result:${result}`);
    }
  } catch (err) {
    logger.error(`Error deleting file from Cloudinary: ${public_id} - ${err}`);
  }
};
