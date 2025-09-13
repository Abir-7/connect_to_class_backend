import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export const app_config = {
  database: {
    uri: process.env.DATABASE_URI,
  },
  server: {
    port: process.env.PORT || "4010",
    node_env: process.env.NODE_ENV || "development",
    ip: process.env.IP_ADDRESS || "0.0.0.0",
    baseurl: process.env.BASE_SERVER_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || "redis",
    port: parseInt(process.env.REDIS_PORT as string) || 6379,
  },
  rabbit_mq: {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672",
  },
  jwt: {
    jwt_access_secret: process.env.JWT_ACCESS_SECRET,
    jwt_access_expire: process.env.JWT_ACCESS_EXPIRE,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
    jwt_refresh_expire: process.env.JWT_REFRESH_EXPIRE,
  },
  bcrypt: {
    salt_round: parseInt(process.env.SALT_ROUND as string) || 10,
  },
  email: {
    from: process.env.EMAIL_FROM,
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT as string) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  multer: {
    file_size_limit: process.env.MAX_FILE_SIZE,
    max_file_number: process.env.MAX_COUNT_FILE as string,
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  ai_key: {
    gemini_ai: process.env.GEMINI_API_KEY,
    open_ai: process.env.OPENAI_API_KEY,
  },
  payment: {
    stripe: {
      secret_key: process.env.STRIPE_SECRET_KEY,
      webhook: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },
  encrypt: {
    s_key: process.env.ENCRYPTION_SECRET_KEY,
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
};
