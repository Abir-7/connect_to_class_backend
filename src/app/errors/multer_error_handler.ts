/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { app_config } from "../config";

const multer_error_handler = (err: any) => {
  const status_code = 400;
  const message = "Multer error";
  const errors: { field: string; message: string }[] = [];

  if (err.code === "LIMIT_FILE_SIZE") {
    const bytes = Number(app_config.multer.file_size_limit);
    const mega_bytes = bytes / (1024 * 1024);

    errors.push({
      field: "",
      message: `File size exceeds the limit of ${mega_bytes} mb`,
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    errors.push({
      field: "",
      message: `You can upload a maximum of ${app_config.multer.max_file_number} files`,
    });
  }

  return { status_code, message, errors };
};

export default multer_error_handler;
