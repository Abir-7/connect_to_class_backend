/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import amqplib, { Channel } from "amqplib";
import logger from "../../utils/serverTools/logger";
import { app_config } from "../../config";

const uri = app_config.rabbit_mq.url as string;
let connection: any = null;
export const get_channel = async (): Promise<Channel> => {
  try {
    if (!connection) {
      connection = await amqplib.connect(uri);

      logger.info("✅ Connected to RabbitMQ");

      // Auto-handle disconnects
      connection.on("close", () => {
        logger.error("RabbitMQ connection closed. Will reconnect on next use.");
        connection = null;
      });

      connection.on("error", (err: any) => {
        logger.error(`RabbitMQ connection error:${err}`);
        connection = null;
      });
    }

    return connection.createChannel();
  } catch (error: any) {
    logger.error(`Error connecting to RabbitMQ: ${error.message || error}`);
    throw new Error(error);
  }
};
