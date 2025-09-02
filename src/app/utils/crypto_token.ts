/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable arrow-body-style */
import crypto from "crypto";

const crypto_token = () => {
  return crypto.randomBytes(32).toString("hex");
};

export default crypto_token;
