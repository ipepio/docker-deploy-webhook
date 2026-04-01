import { type NotificationContext } from './types';

function escapeHtml(value: string): string {
  return value
    .split('&')
    .join('&amp;')
    .split('<')
    .join('&lt;')
    .split('>')
    .join('&gt;')
    .split('"')
    .join('&quot;')
    .split("'")
    .join('&#39;');
}

function formatDuration(durationMs: number): string {
  return `${Math.round(durationMs / 1000)}s`;
}

function getStatusLabel(status: NotificationContext['status']): string {
  switch (status) {
    case 'success':
      return 'SUCCESS';
    case 'rolled_back':
      return 'ROLLED BACK';
    case 'rollback_failed':
      return 'ROLLBACK FAILED';
    case 'failed':
    default:
      return 'FAILED';
  }
}

export function buildMessage(context: NotificationContext): {
  subject: string;
  html: string;
  telegramText: string;
} {
  const statusLabel = getStatusLabel(context.status);
  const duration = formatDuration(context.durationMs);

  const telegramText = [
    `*[${statusLabel}] ${context.repository}*`,
    `Entorno: \`${context.environment}\``,
    `Tag: \`${context.tag}\``,
    context.rollbackTag ? `Rollback tag: \`${context.rollbackTag}\`` : null,
    `Servidor: \`${context.serverId}\``,
    `Duracion: ${duration}`,
    `Job ID: \`${context.jobId}\``,
    `Trigger: ${context.triggeredBy}`,
    context.error ? `Error: ${context.error}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  const subject = `[${statusLabel}] ${context.repository} @ ${context.environment}`;

  const html = `
    <h2>${escapeHtml(statusLabel)} - ${escapeHtml(context.repository)}</h2>
    <p><strong>Entorno:</strong> ${escapeHtml(context.environment)}</p>
    <p><strong>Tag:</strong> ${escapeHtml(context.tag)}</p>
    ${context.rollbackTag ? `<p><strong>Rollback tag:</strong> ${escapeHtml(context.rollbackTag)}</p>` : ''}
    <p><strong>Servidor:</strong> ${escapeHtml(context.serverId)}</p>
    <p><strong>Duracion:</strong> ${escapeHtml(duration)}</p>
    <p><strong>Job ID:</strong> ${escapeHtml(context.jobId)}</p>
    <p><strong>Trigger:</strong> ${escapeHtml(context.triggeredBy)}</p>
    ${context.error ? `<p><strong>Error:</strong> ${escapeHtml(context.error)}</p>` : ''}
  `.trim();

  return {
    subject,
    html,
    telegramText,
  };
}
