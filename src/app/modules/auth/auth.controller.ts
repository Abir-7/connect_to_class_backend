/* eslint-disable @typescript-eslint/no-unused-vars */
import status from "http-status";

import { AuthService } from "./auth.service";
import { app_config } from "../../config";
import catch_async from "../../utils/serverTools/catch_async";
import send_response from "../../utils/serverTools/send_response";

const create_user = catch_async(async (req, res) => {
  const userData = req.body;
  const result = await AuthService.create_user(userData);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "User successfully created.Check your email for code.",
    data: result,
  });
});

const user_login = catch_async(async (req, res, next) => {
  const result = await AuthService.user_login(req.body);

  res.cookie("refreshToken", result.refresh_token, {
    secure: app_config.server.node_env === "production",
    httpOnly: true,
  });

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "User login successfull",
    data: result,
  });
});

const verify_user = catch_async(async (req, res, next) => {
  const { email, otp } = req.body;
  const result = await AuthService.verify_user(email, Number(otp));

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Email successfully verified.",
    data: result,
  });
});

const forgot_password_request = catch_async(async (req, res, next) => {
  const { email } = req.body;
  const result = await AuthService.forgot_password_request(email);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "A verification code is sent to your email.",
    data: result,
  });
});

const reset_password = catch_async(async (req, res, next) => {
  const tokenWithBearer = req.headers.authorization as string;
  const token = tokenWithBearer.split(" ")[1];

  const result = await AuthService.reset_password(token as string, req.body);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Password reset successfully",
    data: result,
  });
});

const get_new_access_token = catch_async(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  const result = await AuthService.get_new_access_token(refreshToken);
  send_response(res, {
    data: result,
    success: true,
    status_code: status.OK,
    message: "New access-token is created.",
  });
});

const update_password = catch_async(async (req, res) => {
  const { user_id } = req.user;

  const result = await AuthService.update_password(user_id, req.body);
  send_response(res, {
    data: result,
    success: true,
    status_code: status.OK,
    message: "Password successfully updated",
  });
});

const re_send_otp = catch_async(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.re_send_otp(email);
  send_response(res, {
    data: result,
    success: true,
    status_code: status.OK,
    message: "Verification Code send successfully",
  });
});

export const AuthController = {
  create_user,
  verify_user,
  forgot_password_request,
  reset_password,
  user_login,
  get_new_access_token,
  update_password,
  re_send_otp,
};
