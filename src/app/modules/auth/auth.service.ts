/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errors/AppError";
import User from "../users/user/user.model";

import { UserProfile } from "../users/user_profile/user_profile.model";
import get_expiry_time from "../../utils/helper/get_expiry_time";
import get_otp from "../../utils/helper/get_otp";
import { send_email } from "../../utils/send_email";
import get_hashed_password from "../../utils/helper/get_hashed_password";
import { app_config } from "../../config";

import mongoose from "mongoose";
import { is_time_expired } from "../../utils/helper/is_time_expire";
import { publish_job } from "../../lib/rabbitMq/publisher";
import { json_web_token } from "../../utils/jwt/jwt";
import { TUserRole } from "../../interface/auth.interface";
import { generate_tokens } from "../../helperFunction/general/generate_token";

const create_user = async (data: {
  email: string;
  full_name: string;
  password: string;
  role: TUserRole;
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isExist = await User.findOne({ email: data.email }).session(session);

    if (isExist && isExist.is_verified === true) {
      throw new AppError(status.BAD_REQUEST, "User already exist");
    }

    if (isExist && isExist.is_verified === false) {
      await User.findOneAndDelete({ _id: isExist._id }).session(session);
      await UserProfile.findOneAndDelete({ user: isExist._id }).session(
        session
      );
    }

    const hashedPassword = await get_hashed_password(data.password);
    const otp = get_otp(4);
    const expDate = get_expiry_time(10);

    const userData = {
      email: data.email,
      password: hashedPassword,
      authentication: { otp, expires_at: expDate },
    };

    const createdUser = await User.create([{ ...userData, role: data.role }], {
      session,
    });

    const userProfileData = {
      full_name: data.full_name,
      user: createdUser[0]._id,
    };
    await UserProfile.create([userProfileData], { session });

    await publish_job("emailQueue", {
      to: data.email,
      subject: "Email Verification Code",
      body: otp.toString(),
    });

    await session.commitTransaction();
    session.endSession();

    return {
      email: createdUser[0].email,
      is_verified: createdUser[0].is_verified,
      user_id: createdUser[0]._id,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const user_login = async (loginData: { email: string; password: string }) => {
  const user_data = await User.findOne({ email: loginData.email }).select(
    "+password"
  );
  if (!user_data) {
    throw new AppError(status.BAD_REQUEST, "Please check your email");
  }

  if (user_data.is_verified === false) {
    throw new AppError(status.BAD_REQUEST, "Please verify your email.");
  }

  const isPassMatch = await user_data.comparePassword(loginData.password);

  if (!isPassMatch) {
    throw new AppError(status.BAD_REQUEST, "Please check your password.");
  }

  const jwt_payload = {
    user_email: user_data.email,
    user_id: user_data._id as string,
    user_role: user_data.role,
  };

  const {
    access_token,
    refresh_token,
    access_token_valid_till,
    refresh_token_valid_till,
  } = generate_tokens(jwt_payload);

  return {
    access_token,
    refresh_token,
    access_token_valid_till,
    refresh_token_valid_till,
    user_id: user_data._id as string,
    email: user_data.email,
    role: user_data.role,
  };
};

const verify_email = async (email: string, otp: number) => {
  if (!otp) {
    throw new AppError(
      status.BAD_REQUEST,
      "OTP is required. Check your email."
    );
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(status.BAD_REQUEST, "User not found.");
  }

  const { otp: storedOtp, expires_at } = user.authentication;

  if (!storedOtp || is_time_expired(expires_at as Date)) {
    throw new AppError(status.BAD_REQUEST, "OTP expired or not found.");
  }

  if (otp !== storedOtp) {
    throw new AppError(status.BAD_REQUEST, "Invalid OTP.");
  }

  user.authentication.otp = null;
  user.authentication.expires_at = null;
  user.is_verified = true;

  const updated_user = await user.save();

  const jwtPayload = {
    user_email: user.email,
    user_id: user._id as string,
    user_role: user.role,
  };

  const {
    access_token,
    refresh_token,
    access_token_valid_till,
    refresh_token_valid_till,
  } = generate_tokens(jwtPayload);

  return {
    user_id: (updated_user._id as string).toString(),
    email: updated_user.email,
    is_verified: updated_user.is_verified,
    access_token,
    refresh_token,
    access_token_valid_till,
    refresh_token_valid_till,
  };
};

export const verify_reset = async (
  email: string,
  otp: number
): Promise<{
  user_id: string | undefined;
  email: string | undefined;
  need_to_reset_password: boolean | undefined;
  token: string | null;
}> => {
  if (!otp) {
    throw new AppError(status.BAD_REQUEST, "Give the Code. Check your email.");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(status.BAD_REQUEST, "User not found");
  }

  const expiration_date = user.authentication.expires_at;
  if (is_time_expired(expiration_date as Date)) {
    throw new AppError(status.BAD_REQUEST, "Code time expired.");
  }

  if (otp !== user.authentication.otp) {
    throw new AppError(status.BAD_REQUEST, "Code not matched.");
  }

  const token = json_web_token.generate_jwt_token(
    { userEmail: user.email },
    app_config.jwt.jwt_access_secret as string,
    "10m"
  );

  const exp_date = get_expiry_time(10);

  const updated_user = await User.findOneAndUpdate(
    { email: user.email },
    {
      "authentication.otp": null,
      "authentication.exp_date": exp_date,
      need_to_reset_password: true,
      "authentication.token": token,
    },
    { new: true }
  );

  return {
    user_id: updated_user?._id as string,
    email: updated_user?.email,
    need_to_reset_password: updated_user?.need_to_reset_password,
    token: token,
  };
};

const forgot_password_request = async (
  email: string
): Promise<{ email: string }> => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError(status.BAD_REQUEST, "Email not found.");
  }

  const otp = get_otp(4);
  const expires_at = get_expiry_time(10);

  const data = {
    otp: otp,
    expires_at: expires_at,
    need_to_reset_password: false,
    token: null,
  };

  await publish_job("emailQueue", {
    to: email,
    subject: "Reset Password Verification Code",
    body: otp.toString(),
  });

  await User.findOneAndUpdate(
    { email },
    { authentication: data },
    { new: true }
  );

  return { email: user.email };
};

const reset_password = async (
  token: string,
  user_data: {
    new_password: string;
    confirm_password: string;
  }
): Promise<{ email: string; user_id: string }> => {
  const { new_password, confirm_password } = user_data;

  if (!token) {
    throw new AppError(
      status.BAD_REQUEST,
      "You are not allowed to reset password."
    );
  }

  const user = await User.findOne({ "authentication.token": token });
  if (!user) {
    throw new AppError(status.BAD_REQUEST, "User not found.");
  }

  const currentDate = new Date();
  const expirationDate = new Date(user.authentication.expires_at as Date);

  if (currentDate > expirationDate) {
    throw new AppError(status.BAD_REQUEST, "Token expired.");
  }

  if (new_password !== confirm_password) {
    throw new AppError(
      status.BAD_REQUEST,
      "New password and Confirm password doesn't match!"
    );
  }

  const decode = json_web_token.verify_jwt_token(
    token,
    app_config.jwt.jwt_access_secret as string
  );

  const hassedPassword = await get_hashed_password(new_password);

  const updateData = await User.findOneAndUpdate(
    { email: decode.user_email },
    {
      password: hassedPassword,
      authentication: { otp: null, token: null, expires_at: null },
      need_to_reset_password: false,
    },
    { new: true }
  );
  if (!updateData) {
    throw new AppError(
      status.BAD_REQUEST,
      "Failed to reset password. Try again."
    );
  }
  return { email: updateData?.email as string, user_id: user._id as string };
};

const get_new_access_token = async (
  refreshToken: string
): Promise<{ accessToken: string }> => {
  if (!refreshToken) {
    throw new AppError(status.UNAUTHORIZED, "Refresh token not found.");
  }
  const decode = json_web_token.verify_jwt_token(
    refreshToken,
    app_config.jwt.jwt_refresh_secret as string
  );

  const { user_email, user_id, user_role } = decode;

  if (user_email && user_id && user_role) {
    const jwtPayload = {
      user_email: user_email,
      user_id: user_id,
      user_role: user_role,
    };

    const accessToken = json_web_token.generate_jwt_token(
      jwtPayload,
      app_config.jwt.jwt_access_secret as string,
      app_config.jwt.jwt_access_expire
    );
    return { accessToken };
  } else {
    throw new AppError(status.UNAUTHORIZED, "You are unauthorized.");
  }
};

const update_password = async (
  userId: string,
  passData: {
    new_password: string;
    confirm_password: string;
    old_password: string;
  }
): Promise<{ message: string; user: string }> => {
  const { new_password, confirm_password, old_password } = passData;

  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  const isPassMatch = await user.comparePassword(old_password);

  if (!isPassMatch) {
    throw new AppError(status.BAD_REQUEST, "Old password not matched.");
  }

  if (new_password !== confirm_password) {
    throw new AppError(
      status.BAD_REQUEST,
      "New password and Confirm password doesn't match!"
    );
  }

  const hassedPassword = await get_hashed_password(new_password);

  if (!hassedPassword) {
    throw new AppError(
      status.BAD_REQUEST,
      "Failed to update password. Try again."
    );
  }

  user.password = hassedPassword;
  await user.save();

  return { user: user.email, message: "Password successfully updated." };
};

const re_send_otp = async (userEmail: string): Promise<{ message: string }> => {
  const userData = await User.findOne({ email: userEmail });

  if (!userData?.authentication.otp) {
    throw new AppError(500, "Don't find any expired code");
  }

  const OTP = get_otp(4);

  const updateUser = await User.findOneAndUpdate(
    { email: userEmail },
    {
      $set: {
        "authentication.otp": OTP,
        "authentication.expDate": new Date(Date.now() + 10 * 60 * 1000), //10min
      },
    },
    { new: true }
  );

  if (!updateUser) {
    throw new AppError(500, "Failed to Send. Try Again!");
  }

  await send_email(userEmail, "Verification Code", `CODE: ${OTP}`);
  return { message: "Verification code send." };
};
export const AuthService = {
  create_user,
  user_login,
  verify_email,
  forgot_password_request,
  reset_password,
  get_new_access_token,
  update_password,
  re_send_otp,
};
