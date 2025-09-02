/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from "jsonwebtoken";
import { IAuthData } from "../../interface/auth.interface";
import { jwtDecode } from "jwt-decode";

const verify_jwt_token = (token: string, secret: string) => {
  try {
    return jwt.verify(token, secret) as IAuthData;
  } catch (error: any) {
    throw new Error(error);
  }
};

const generate_jwt_token = (
  payload: object,
  secret: string,
  expires_in: any
) => {
  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: expires_in,
    });
    return token;
  } catch (error: any) {
    throw new Error(error);
  }
};

const decode_jwt_token = (token: string) => {
  try {
    const decoded = jwtDecode(token);
    return decoded;
  } catch (error: any) {
    throw new Error(error);
  }
};

export const json_web_token = {
  verify_jwt_token,
  generate_jwt_token,
  decode_jwt_token,
};
