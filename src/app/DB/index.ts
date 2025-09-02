/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import { app_config } from "../config";

import User from "../modules/users/user/user.model";
import logger from "../utils/serverTools/logger";
import get_hashed_password from "../utils/helper/get_hashed_password";
import { UserProfile } from "../modules/users/user_profile/user_profile.model";
import { user_roles } from "../interface/auth.interface";

const super_user = {
  role: user_roles.ADMIN,
  email: app_config.admin.email,
  password: app_config.admin.password,
  is_verified: true,
};

const super_user_profile = {
  full_name: "Admin-1",
  email: app_config.admin.email,
};

const seed_admin = async (): Promise<void> => {
  const is_exist_super_admin = await User.findOne({
    role: user_roles.ADMIN,
  });

  if (is_exist_super_admin) {
    logger.info("Admin already created");
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    super_user.password = await get_hashed_password(
      super_user.password as string
    );

    const data = await User.create(
      [
        {
          ...super_user,
          authentication: { exp_date: null, otp: null, token: null },
        },
      ],
      { session }
    );
    await UserProfile.create([{ ...super_user_profile, user: data[0]._id }], {
      session,
    });

    await session.commitTransaction();
    logger.info("Admin Created");
  } catch (error: any) {
    await session.abortTransaction();
    logger.error(`Failed to create Admin. ${error} `);
  } finally {
    session.endSession();
  }
};

export default seed_admin;
