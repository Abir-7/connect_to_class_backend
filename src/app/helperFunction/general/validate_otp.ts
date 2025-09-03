//--------------------------- user in auth

import status from "http-status";
import AppError from "../../errors/AppError";

interface AuthenticationData {
  otp?: string | null;
  expires_at?: Date | null;
}

export const validate_otp = (
  provided_otp: string,
  authentication: AuthenticationData
): void => {
  const { otp: stored_otp, expires_at } = authentication;

  if (!stored_otp || !expires_at || new Date() > new Date(expires_at)) {
    throw new AppError(status.BAD_REQUEST, "OTP expired or not found.");
  }

  if (Number(provided_otp) !== Number(stored_otp)) {
    throw new AppError(status.BAD_REQUEST, "Invalid OTP.");
  }
};
