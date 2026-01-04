import { Queue } from "bullmq";
import { connection } from "..";
import { queue_name } from "./queue.const";

export interface EmailJobData {
  to: string;
  subject: string;
  code: string;
  project_name: string;
  expire_time: number;
  purpose: string;
  body: string;
}

export const emailQueue = new Queue<EmailJobData>(queue_name.email, {
  connection: connection,
});
