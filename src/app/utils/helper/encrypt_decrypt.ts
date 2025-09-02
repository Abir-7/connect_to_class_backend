// utils/encryptor.ts
import crypto from "crypto";
import { app_config } from "../../config";

const algorithm = "aes-256-cbc";
const secretKey = crypto
  .createHash("sha256")
  .update(app_config.encrypt.s_key as string) // 🔐 use env var in production
  .digest("base64")
  .substr(0, 32); // 32 bytes for aes-256

// Encrypt function that returns a single string (iv:encryptedData)
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16); // 16-byte IV
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");

  // Combine iv and encrypted data using ':'
  return `${iv.toString("hex")}:${encrypted}`;
};

// Decrypt function that accepts a single string (iv:encryptedData)
export const decrypt = (combined: string): string => {
  const [ivHex, encryptedData] = combined.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
