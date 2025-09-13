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
    app_config.server.ip as string,
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

// import cluster from "cluster";
// import os from "os";
// import dotenv from "dotenv";
// dotenv.config();

// import mongoose from "mongoose";
// import server from "./app";
// import { app_config } from "./app/config";
// import logger from "./app/utils/serverTools/logger";
// import seedAdmin from "./app/DB";

// const numCPUs = os.cpus().length;

// if (cluster.isPrimary) {
//   logger.info(`Primary process ${process.pid} is running`);
//   logger.info(`Forking ${numCPUs} workers...`);

//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   cluster.on("exit", (worker, code, signal) => {
//     logger.error(
//       `Worker ${worker.process.pid} died with code ${code} (${signal}). Restarting...`
//     );
//     cluster.fork();
//   });

//   // Optional: handle signals for graceful shutdown on primary
//   process.on("SIGINT", () => {
//     logger.info("SIGINT received, shutting down primary...");
//     process.exit(0);
//   });
//   process.on("SIGTERM", () => {
//     logger.info("SIGTERM received, shutting down primary...");
//     process.exit(0);
//   });
// } else {
//   // Worker process

//   process.on("uncaughtException", (err) => {
//     logger.error(`Uncaught exception (worker ${process.pid}):`, err);
//     process.exit(1);
//   });

//   process.on("unhandledRejection", (err) => {
//     logger.error(`Unhandled rejection (worker ${process.pid}):`, err);
//     process.exit(1);
//   });

//   const main = async () => {
//     const mongoUri = app_config.database.dataBase_uri as string;

//     if (!mongoUri) {
//       logger.error("MongoDB connection URI is not defined!");
//       process.exit(1);
//     }

//     await mongoose.connect(mongoUri);
//     logger.info(`MongoDB connected (worker ${process.pid})`);

//     await seedAdmin();

//     // Increase server timeout for long uploads (15 minutes)
//     server.setTimeout(15 * 60 * 1000);

//     const port = Number(app_config.server.port) || 3000;
//     const ip = app_config.server.ip || "0.0.0.0";

//     server.listen(port, ip, () => {
//       logger.info(`Worker ${process.pid} listening on ${ip}:${port}`);
//     });
//   };

//   main().catch((err) => {
//     logger.error(`Error starting server (worker ${process.pid}):`, err);
//     process.exit(1);
//   });
// }
