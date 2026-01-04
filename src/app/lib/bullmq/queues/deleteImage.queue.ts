import { Queue } from "bullmq";
import { connection } from "..";
import { queue_name } from "./queue.const";

export interface DeleteImageJobData {
  public_id: string;
}

export const deleteImageQueue = new Queue<DeleteImageJobData>(
  queue_name.image_delete,
  {
    connection: connection,
  }
);
