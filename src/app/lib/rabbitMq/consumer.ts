/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "../../utils/serverTools/logger";
import { get_channel } from "./rabbit_mq";

type job_handler = (data: any) => Promise<void>;

export const consume_queue = async (
  queue_name: string,
  handler: job_handler
): Promise<void> => {
  const channel = await get_channel();
  await channel.assertQueue(queue_name, { durable: true });

  logger.info(` [*] Waiting for messages in ${queue_name}`);

  channel.consume(
    queue_name,
    async (msg) => {
      logger.info(`Message received in queue: ${queue_name}`); // <-- Log here to confirm receipt
      if (msg) {
        const content = msg.content.toString();
        const data = JSON.parse(content);
        try {
          await handler(data);
          channel.ack(msg);
        } catch (error) {
          logger.error(`Error processing ${queue_name}:`, error);
          channel.nack(msg, false, true); // Optionally retry the message
        }
      }
    },
    { noAck: false }
  );
};
