/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import AppError from "../../errors/AppError";
import status from "http-status";
import { TUserRole } from "../../interface/auth.interface";

import { app_config } from "../../config";
import User from "../../modules/users/user/user.model";
import { json_web_token } from "../../utils/jwt/jwt";

export const auth =
  (...userRole: TUserRole[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenWithBearer = req.headers.authorization as string;

      if (!tokenWithBearer || !tokenWithBearer.startsWith("Bearer")) {
        return next(
          new AppError(status.UNAUTHORIZED, "You are not authorized")
        );
      }

      const token = tokenWithBearer.split(" ")[1];

      if (token === "null") {
        return next(
          new AppError(status.UNAUTHORIZED, "You are not authorized")
        );
      }

      const decodedData = json_web_token.verify_jwt_token(
        token,
        app_config.jwt.jwt_access_secret as string
      );

      const userData = await User.findById(decodedData.user_id);

      if (!userData) {
        return next(
          new AppError(status.UNAUTHORIZED, "You are not authorized")
        );
      }

      if (userRole.length && !userRole.includes(decodedData.user_role)) {
        return next(
          new AppError(status.UNAUTHORIZED, "You are not authorized")
        );
      }

      if (
        userData.role !== decodedData.user_role ||
        userData.email !== decodedData.user_email
      ) {
        return next(
          new AppError(status.UNAUTHORIZED, "You are not authorized")
        );
      }

      req.user = decodedData;

      return next();
    } catch (error) {
      return next(
        new AppError(status.UNAUTHORIZED, "Invalid or expired token")
      );
    }
  };
