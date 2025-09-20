import { AnyZodObject, ZodError } from "zod";

import { NextFunction, Request, Response } from "express";
import unlink_file from "./fileUpload/multer_file_storage/unlink_files";
import { get_relative_path } from "./fileUpload/multer_file_storage/get_relative_path";
import catch_async from "../utils/serverTools/catch_async";

const zod_validator = (schema: AnyZodObject) =>
  catch_async(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({ body: req.body });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        if (req.file?.path) {
          unlink_file(get_relative_path(req.file?.path));
        }
        return next(error);
      }

      return next(error);
    }
  });

export default zod_validator;
