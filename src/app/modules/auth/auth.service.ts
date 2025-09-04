/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errors/AppError";
import User from "../users/user/user.model";

import { UserProfile } from "../users/user_profile/user_profile.model";
import get_expiry_time from "../../utils/helper/get_expiry_time";
import get_otp from "../../utils/helper/get_otp";

import get_hashed_password from "../../utils/helper/get_hashed_password";
import { app_config } from "../../config";

import mongoose from "mongoose";

import { publish_job } from "../../lib/rabbitMq/publisher";
import { json_web_token } from "../../utils/jwt/jwt";
import { TUserRole } from "../../interface/auth.interface";
import { generate_tokens } from "../../helperFunction/general/generate_token";
import { validate_otp } from "../../helperFunction/general/validate_otp";

const expires_at = get_expiry_time(10);

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

    const user_data = {
      email: data.email,
      password: hashedPassword,
      authentication: { otp, expires_at },
    };

    const created_user = await User.create(
      [{ ...user_data, role: data.role }],
      {
        session,
      }
    );

    const user_profile_data = {
      full_name: data.full_name,
      user: created_user[0]._id,
    };
    await UserProfile.create([user_profile_data], { session });

    await publish_job("emailQueue", {
      to: data.email,
      subject: "Email Verification Code",
      body: otp.toString(),
    });

    await session.commitTransaction();
    session.endSession();

    return {
      email: created_user[0].email,
      is_verified: created_user[0].is_verified,
      user_id: created_user[0]._id,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const user_login = async (login_data: { email: string; password: string }) => {
  // Select only needed fields + password
  const user = await User.findOne({ email: login_data.email })
    .select("email role password is_verified")
    .lean(); // returns plain JS object, faster than Mongoose doc

  if (!user) {
    throw new AppError(status.BAD_REQUEST, "Please check your email");
  }

  if (!user.is_verified) {
    throw new AppError(status.BAD_REQUEST, "Please verify your email.");
  }

  // Use the model instance to compare password
  const user_doc = await User.findById(user._id).select("+password"); // only for comparePassword
  const is_pass_match = await user_doc!.comparePassword(login_data.password);
  if (!is_pass_match) {
    throw new AppError(status.BAD_REQUEST, "Please check your password.");
  }

  const jwt_payload = {
    user_email: user.email,
    user_id: user._id.toString(),
    user_role: user.role,
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
    user_id: user._id.toString(),
    email: user.email,
    role: user.role,
  };
};

const verify_email = async (user_id: string, otp: number) => {
  if (!otp) {
    throw new AppError(
      status.BAD_REQUEST,
      "OTP is required. Check your email."
    );
  }
  console.log(user_id);
  const user = await User.findOne({ _id: user_id });
  if (!user) {
    throw new AppError(status.BAD_REQUEST, "User not found.");
  }

  validate_otp(otp.toString(), user.authentication as any);

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
    role: updated_user.role,
  };
};

const verify_reset = async (
  user_id: string,
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

  const user = await User.findOne({ _id: user_id });
  if (!user) {
    throw new AppError(status.BAD_REQUEST, "User not found");
  }

  validate_otp(otp.toString(), user.authentication as any);

  const token = json_web_token.generate_jwt_token(
    { user_email: user.email, user_id: user._id },
    app_config.jwt.jwt_access_secret as string,
    "10m"
  );

  const updated_user = await User.findOneAndUpdate(
    { email: user.email },
    {
      "authentication.otp": null,
      "authentication.expires_at": expires_at,
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
): Promise<{ email: string; user_id: string }> => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError(status.BAD_REQUEST, "Email not found.");
  }

  const otp = get_otp(4);

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

  return { email: user.email, user_id: user._id as string };
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

  const current_date = new Date();
  const expiration_date = new Date(user.authentication.expires_at as Date);

  if (current_date > expiration_date) {
    throw new AppError(status.BAD_REQUEST, "Token expired.");
  }

  if (new_password !== confirm_password) {
    throw new AppError(
      status.BAD_REQUEST,
      "New password and confirm password doesn't match!"
    );
  }

  const decoded = json_web_token.verify_jwt_token(
    token,
    app_config.jwt.jwt_access_secret as string
  );
  console.log(decoded, token);

  const hashed_password = await get_hashed_password(new_password);

  const update_data = await User.findOneAndUpdate(
    { email: decoded.user_email },
    {
      password: hashed_password,
      authentication: { otp: null, token: null, expires_at: null },
      need_to_reset_password: false,
    },
    { new: true }
  );

  if (!update_data) {
    throw new AppError(
      status.BAD_REQUEST,
      "Failed to reset password. Try again."
    );
  }

  return { email: update_data?.email as string, user_id: user._id as string };
};

const get_new_access_token = async (
  refresh_token: string
): Promise<{ access_token: string }> => {
  if (!refresh_token) {
    throw new AppError(status.UNAUTHORIZED, "Refresh token not found.");
  }

  const decoded = json_web_token.verify_jwt_token(
    refresh_token,
    app_config.jwt.jwt_refresh_secret as string
  );

  const { user_email, user_id, user_role } = decoded;

  if (user_email && user_id && user_role) {
    const jwt_payload = {
      user_email,
      user_id,
      user_role,
    };

    const access_token = json_web_token.generate_jwt_token(
      jwt_payload,
      app_config.jwt.jwt_access_secret as string,
      app_config.jwt.jwt_access_expire
    );

    return { access_token };
  } else {
    throw new AppError(status.UNAUTHORIZED, "You are unauthorized.");
  }
};

const update_password = async (
  user_id: string,
  pass_data: {
    new_password: string;
    confirm_password: string;
    old_password: string;
  }
): Promise<{ email: string; user_id: string }> => {
  const { new_password, confirm_password, old_password } = pass_data;

  const user = await User.findById(user_id).select("+password");
  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  const is_pass_match = await user.comparePassword(old_password);

  if (!is_pass_match) {
    throw new AppError(status.BAD_REQUEST, "Old password not matched.");
  }

  if (new_password !== confirm_password) {
    throw new AppError(
      status.BAD_REQUEST,
      "New password and Confirm password doesn't match!"
    );
  }

  const hashed_password = await get_hashed_password(new_password);

  if (!hashed_password) {
    throw new AppError(
      status.BAD_REQUEST,
      "Failed to update password. Try again."
    );
  }

  user.password = hashed_password;
  await user.save();

  return { email: user.email, user_id: user._id as string };
};

const re_send_otp = async (user_id: string): Promise<{ message: string }> => {
  // Step 1: Find user
  const user_data = await User.findById(user_id).select(
    "email authentication.otp"
  );

  if (!user_data) {
    throw new AppError(404, "User not found.");
  }

  // Step 2: Validate existing OTP
  if (!user_data.authentication?.otp) {
    throw new AppError(400, "No expired code found.");
  }

  // Step 3: Generate new OTP
  const otp = get_otp(4);

  // Step 4: Update OTP + expiry
  user_data.authentication.otp = otp;
  user_data.authentication.expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await user_data.save();

  // Step 5: Send email async job
  await publish_job("emailQueue", {
    to: user_data.email,
    subject: "Verification Code",
    body: otp.toString(),
  });

  return { message: "Verification code sent." };
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
  verify_reset,
};
