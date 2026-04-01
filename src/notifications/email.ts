import { Resend } from 'resend';

import { logger } from '../logger';

export async function sendEmailNotification(
  apiKey: string,
  from: string,
  recipients: string[],
  subject: string,
  html: string,
): Promise<void> {
  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
    });
  } catch (error) {
    logger.warn('Email notification failed', {
      recipients,
      error: String(error),
    });
  }
}
