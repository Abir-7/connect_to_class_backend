/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import AppError from "../../../errors/AppError";

export const parse_data_field =
  (field_name: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.body[field_name]) {
        req.body = JSON.parse(req.body[field_name]);
        next();
      } else {
        next();
      }
    } catch (error: any) {
      throw new AppError(500, "Invalid JSON string");
    }
  };
