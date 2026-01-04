import { deleteFileFromCloudinary } from "../../../middleware/fileUpload/cloudinay_file_upload/deleteFromCloudinary";

import logger from "../../../utils/serverTools/logger";
import { DeleteImageJobData } from "../queues/deleteImage.queue";

export async function handleImageDeleteJob(
  data: DeleteImageJobData
): Promise<void> {
  await deleteFileFromCloudinary(data.public_id);

  logger.info("✅ Image deleted.");
}
