/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import amqplib from "amqplib";
import logger from "../../utils/serverTools/logger";
import { app_config } from "../../config";

const uri = app_config.rabbit_mq.url as string;

export const get_channel = async () => {
  try {
    const connection = await amqplib.connect(uri);
    const channel = await connection.createChannel();
    return channel;
  } catch (error: any) {
    logger.error(`Error connecting to RabbitMQ: ${error}`);
    throw new Error(error);
  }
};
