import { Worker, Job } from "bullmq";
import { connection } from "..";

import { queue_name } from "../queues/queue.const";
import logger from "../../../utils/serverTools/logger";
import { DeleteImageJobData } from "../queues/deleteImage.queue";
import { handleImageDeleteJob } from "../jobs/deleteImage.handler";

export const deleteImageWorker = new Worker<DeleteImageJobData>(
  queue_name.image_delete,
  async (job: Job<DeleteImageJobData>) => {
    logger.info(`👷 Processing job ${job.id}`);
    await handleImageDeleteJob(job.data);
  },
  { connection: connection }
);

deleteImageWorker.on("completed", (job) => {
  logger.info(`🎉 Job ${job.id} completed`);
});

deleteImageWorker.on("failed", (job, err) => {
  logger.error(`❌ Job ${job?.id} failed: ${err.message}`);
});
