/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";

const env = process.env.NODE_ENV || "development";
const log_dir = path.join(process.cwd(), "logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(log_dir)) {
  fs.mkdirSync(log_dir, { recursive: true });
}

const daily_rotate_file_transport = new DailyRotateFile({
  filename: path.join(log_dir, "%DATE%-app.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
});

const error_filter = format((info) => (info.level === "error" ? info : false));

const exception_handlers = [
  new DailyRotateFile({
    filename: path.join(log_dir, "%DATE%-exceptions.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "30d",
    format: format.combine(error_filter(), format.timestamp(), format.json()),
  }),
];

const rejection_handlers = [
  new DailyRotateFile({
    filename: path.join(log_dir, "%DATE%-rejections.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "30d",
    format: format.combine(error_filter(), format.timestamp(), format.json()),
  }),
];

const logger = createLogger({
  level: env === "development" ? "debug" : "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "your-service-name" },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    }),
    daily_rotate_file_transport,
  ],
  exceptionHandlers: exception_handlers,
  rejectionHandlers: rejection_handlers,
});

export const morgan_stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
