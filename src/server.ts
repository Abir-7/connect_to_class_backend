/* eslint-disable no-console */

import server from "./app";
import { app_config } from "./app/config";
import mongoose from "mongoose";
import logger from "./app/utils/serverTools/logger";

import { start_consumers } from "./app/lib/rabbitMq/worker";
import seed_admin from "./app/DB";
import { initSocket } from "./app/lib/socket/socket";

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled promise rejection:", err);

  process.exit(1);
});

const main = async () => {
  await mongoose.connect(app_config.database.uri as string, {});
  logger.info("MongoDB connected");
  await seed_admin();
  await initSocket(server);
  start_consumers();
  // Wait up to 15 minutes for request to finish uploading //
  server.setTimeout(15 * 60 * 1000);
  //------------------------//
  server.listen(
    Number(app_config.server.port),
    //  app_config.server.ip as string,
    () => {
      logger.info(
        `Example app listening on port ${app_config.server.port} & ip:${
          app_config.server.ip as string
        }`
      );
    }
  );
};
main().catch((err) => logger.error("Error connecting to MongoDB:", err));
