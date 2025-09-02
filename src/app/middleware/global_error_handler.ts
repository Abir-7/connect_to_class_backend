/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";

import mongoose from "mongoose";
import { handle_zod_error } from "../errors/handle_zod_error";

import { ZodError } from "zod";
import multer from "multer";

import logger from "../utils/serverTools/logger";
import multer_error_handler from "../errors/multer_error_handler";
import AppError from "../errors/AppError";

export const global_error_handler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let status_code = err.status_code || 500;
  let message = err.message || "Something went wrong!";
  let errors_list: any = [];

  if (err instanceof mongoose.Error.ValidationError) {
    status_code = 400;
    message = "Validation failed";
    errors_list = Object.values(err.errors).map((error: any) => ({
      field: error.path,
      message: error.message,
    }));
  } else if (err.code === 11000) {
    status_code = 400;
    message = `${Object.keys(err.keyValue).join(", ")} already exist`;
    errors_list = [
      {
        field: "",
        message: `Duplicate key error: ${Object.keys(err.keyValue).join(", ")}`,
      },
    ];
  } else if (err instanceof mongoose.Error.CastError) {
    status_code = 400;
    message = `Invalid value for ${err.path}`;
    errors_list = [
      {
        field: err.path,
        message: `Invalid value for ${err.path}`,
      },
    ];
  } else if (err?.name === "ValidationError") {
    status_code = 400;
    message = "Validation failed";
    errors_list = Object.values(err.errors).map((error: any) => ({
      field: error.path,
      message: error.message,
    }));
  } else if (err instanceof ZodError) {
    const zod_error = handle_zod_error(err);
    status_code = zod_error.status_code;
    message = zod_error.message;
    errors_list = zod_error.errors;
  } else if (err?.name === "TokenExpiredError") {
    status_code = 401;
    message = "Your session has expired. Please login again.";
    errors_list = [
      {
        path: "token",
        message,
      },
    ];
  } else if (err instanceof multer.MulterError) {
    const multer_error = multer_error_handler(err);
    status_code = multer_error.status_code;
    message = multer_error.message;
    errors_list = multer_error.errors;
  } else if (err instanceof AppError) {
    status_code = err.status_code;
    message = err.message;
    errors_list = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err instanceof Error) {
    message = err.message;
    errors_list = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  logger.error(err);
  res.status(status_code).json({
    success: false,
    status: status_code,
    message,
    errors: errors_list.length ? errors_list : undefined,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
