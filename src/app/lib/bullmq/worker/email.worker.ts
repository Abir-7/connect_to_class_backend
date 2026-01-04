import { Worker, Job } from "bullmq";
import { connection } from "..";
import { EmailJobData } from "../queues/email.queue";
import { handleEmailJob } from "../jobs/email.handler";
import { queue_name } from "../queues/queue.const";
import logger from "../../../utils/serverTools/logger";

export const emailWorker = new Worker<EmailJobData>(
  queue_name.email,
  async (job: Job<EmailJobData>) => {
    logger.info(`👷 Processing job ${job.id}`);
    await handleEmailJob(job.data);
  },
  { connection: connection }
);

emailWorker.on("completed", (job) => {
  logger.info(`🎉 Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  logger.error(`❌ Job ${job?.id} failed: ${err.message}`);
});
