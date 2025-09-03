/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { app_config } from "../../config";
import { json_web_token } from "../../utils/jwt/jwt";

//----------------------------------------------- used in auth for access token and refresh token

interface JwtPayload {
  user_email: string;
  user_id: string;
  user_role: string;
}

export const generate_tokens = (payload: JwtPayload) => {
  const access_token = json_web_token.generate_jwt_token(
    payload,
    app_config.jwt.jwt_access_secret as string,
    app_config.jwt.jwt_access_expire
  );

  const refresh_token = json_web_token.generate_jwt_token(
    payload,
    app_config.jwt.jwt_refresh_secret as string,
    app_config.jwt.jwt_refresh_expire
  );

  const decoded_access = json_web_token.decode_jwt_token(access_token);
  const decoded_refresh = json_web_token.decode_jwt_token(refresh_token);

  return {
    access_token,
    refresh_token,
    access_token_valid_till: decoded_access?.exp,
    refresh_token_valid_till: decoded_refresh?.exp,
  };
};
