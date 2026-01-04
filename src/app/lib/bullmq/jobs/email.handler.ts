import { sendEmail } from "../../../utils/send_email";
import logger from "../../../utils/serverTools/logger";
import { EmailJobData } from "../queues/email.queue";

export async function handleEmailJob(data: EmailJobData): Promise<void> {
  logger.info(`📨 Sending email to user ${data.to}...`);

  await sendEmail({
    to: data.to,
    subject: data.subject,
    code: data.code,
    expire_time: data.expire_time,
    project_name: data.project_name,
    purpose: data.purpose,
  });

  logger.info(`✅ Email sent to user ${data.to}: "${data.subject}"`);
}
