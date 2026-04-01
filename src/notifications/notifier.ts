import { getConfig, getRepoConfig } from '../config';
import { logger } from '../logger';
import { type DeployJob } from '../queue/job.types';
import { sleep } from '../utils/sleep';
import { type DeployResult } from '../deploy/types';
import { sendEmailNotification } from './email';
import { buildMessage } from './messages';
import { sendTelegramNotification } from './telegram';
import { type NotificationContext, type NotificationTargets } from './types';

export function resolveTargets(repository: string, environment: string): NotificationTargets {
  const config = getConfig();
  const repoConfig = getRepoConfig(repository);
  const environmentConfig = repoConfig?.environments[environment];

  const telegramBase = {
    enabled: config.server.notifications.telegram.enabled,
    botToken: config.server.notifications.telegram.botToken,
    chatIds: config.server.notifications.telegram.chatIds,
  };

  const emailBase = {
    enabled: config.server.notifications.email.enabled,
    apiKey: config.server.notifications.email.resendApiKey,
    from: config.server.notifications.email.from,
    recipients: config.server.notifications.email.recipients,
  };

  return {
    telegram: environmentConfig?.notifications?.telegram
      ? {
          ...telegramBase,
          chatIds: environmentConfig.notifications.telegram.chatIds,
        }
      : telegramBase,
    email: environmentConfig?.notifications?.email
      ? {
          ...emailBase,
          recipients: environmentConfig.notifications.email.recipients,
        }
      : emailBase,
  };
}

export async function sendNotification(job: DeployJob, result: DeployResult): Promise<void> {
  const config = getConfig();
  const targets = resolveTargets(job.payload.repository, job.payload.environment);

  const notificationContext: NotificationContext = {
    serverId: config.server.id,
    jobId: job.id,
    repository: job.payload.repository,
    environment: job.payload.environment,
    tag: job.payload.tag,
    status: result.status,
    durationMs: result.durationMs,
    error: result.error,
    rollbackTag: result.rollbackTag,
    triggeredBy: job.payload.triggeredBy,
  };

  const { subject, html, telegramText } = buildMessage(notificationContext);
  const pendingNotifications: Array<Promise<void>> = [];

  if (
    targets.telegram.enabled &&
    targets.telegram.botToken &&
    targets.telegram.chatIds.length > 0
  ) {
    pendingNotifications.push(
      sendTelegramNotification(targets.telegram.botToken, targets.telegram.chatIds, telegramText),
    );
  }

  if (
    targets.email.enabled &&
    targets.email.apiKey &&
    targets.email.from &&
    targets.email.recipients.length > 0
  ) {
    pendingNotifications.push(
      sendEmailNotification(
        targets.email.apiKey,
        targets.email.from,
        targets.email.recipients,
        subject,
        html,
      ),
    );
  }

  if (pendingNotifications.length === 0) {
    return;
  }

  await Promise.race([
    Promise.allSettled(pendingNotifications),
    sleep(15000).then(() => {
      logger.warn('Notification dispatch timed out', {
        jobId: job.id,
        repository: job.payload.repository,
      });
    }),
  ]);
}
