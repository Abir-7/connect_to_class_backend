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
import { IUser } from "../users/user/user.interface";
import mongoose from "mongoose";
import { is_time_expired } from "../../utils/helper/is_time_expire";
import { publish_job } from "../../lib/rabbitMq/publisher";
import { json_web_token } from "../../utils/jwt/jwt";
import { TUserRole } from "../../interface/auth.interface";

const create_user = async (data: {
  email: string;
  full_name: string;
  password: string;
  role: TUserRole;
}): Promise<Partial<IUser>> => {
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
      authentication: { otp, exp_date: expDate },
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
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const user_login = async (loginData: {
  email: string;
  password: string;
}): Promise<{
  access_token: string;
  user_id: string;
  email: string;
  refresh_token: string;
}> => {
  const userData = await User.findOne({ email: loginData.email }).select(
    "+password"
  );
  if (!userData) {
    throw new AppError(status.BAD_REQUEST, "Please check your email");
  }

  if (userData.is_verified === false) {
    throw new AppError(status.BAD_REQUEST, "Please verify your email.");
  }

  const isPassMatch = await userData.comparePassword(loginData.password);

  if (!isPassMatch) {
    throw new AppError(status.BAD_REQUEST, "Please check your password.");
  }

  const jwtPayload = {
    user_email: userData.email,
    user_id: userData._id,
    user_role: userData.role,
  };

  const accessToken = json_web_token.generate_jwt_token(
    jwtPayload,
    app_config.jwt.jwt_access_secret as string,
    app_config.jwt.jwt_access_expire
  );

  const refreshToken = json_web_token.generate_jwt_token(
    jwtPayload,
    app_config.jwt.jwt_refresh_secret as string,
    app_config.jwt.jwt_refresh_expire
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: userData._id as string,
    email: userData.email,
  };
};

const verify_user = async (
  email: string,
  otp: number
): Promise<{
  user_id: string | undefined;
  email: string | undefined;
  is_verified: boolean | undefined;
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

  const expirationDate = user.authentication.exp_date;

  if (is_time_expired(expirationDate)) {
    throw new AppError(status.BAD_REQUEST, "Code time expired.");
  }

  if (otp !== user.authentication.otp) {
    throw new AppError(status.BAD_REQUEST, "Code not matched.");
  }

  let updatedUser;
  let token = null;
  if (user.is_verified) {
    token = json_web_token.generate_jwt_token(
      { userEmail: user.email },
      app_config.jwt.jwt_access_secret as string,
      "10m"
    );

    const exp_date = get_expiry_time(10);

    updatedUser = await User.findOneAndUpdate(
      { email: user.email },
      {
        "authentication.otp": null,
        "authentication.exp_date": exp_date,
        need_to_reset_password: true,
        "authentication.token": token,
      },
      { new: true }
    );
  } else {
    updatedUser = await User.findOneAndUpdate(
      { email: user.email },
      {
        "authentication.otp": null,
        "authentication.exp_date": null,
        is_verified: true,
      },
      { new: true }
    );
  }

  return {
    user_id: updatedUser?._id as string,
    email: updatedUser?.email,
    is_verified: updatedUser?.is_verified,
    need_to_reset_password: updatedUser?.need_to_reset_password,
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
  const exp_date = get_expiry_time(10);

  const data = {
    otp: otp,
    exp_date: exp_date,
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
  const expirationDate = new Date(user.authentication.exp_date);

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
      authentication: { otp: null, token: null, exp_date: null },
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
  verify_user,
  forgot_password_request,
  reset_password,
  get_new_access_token,
  update_password,
  re_send_otp,
};
