import { createHmac } from 'crypto';
import { type Request } from 'express';

import { getConfig, getRepoConfig } from '../config';
import { HttpError } from '../errors/http-error';
import { safeCompare } from '../utils/safe-compare';

function parseTimestamp(timestampHeader: string): number {
  if (/^\d+$/.test(timestampHeader)) {
    return Number(timestampHeader) * 1000;
  }

  const parsed = Date.parse(timestampHeader);
  if (Number.isNaN(parsed)) {
    throw new HttpError(401, 'unauthorized', 'Invalid timestamp');
  }

  return parsed;
}

function getBearerToken(request: Request): string {
  const authorization = request.header('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new HttpError(401, 'unauthorized', 'Missing authorization header');
  }

  return authorization.slice('Bearer '.length).trim();
}

export interface AuthenticatedWebhookContext {
  repository: string;
}

export function authenticateWebhook(request: Request): AuthenticatedWebhookContext {
  const rawRequest = request as Request & { rawBody?: Buffer };
  const timestampHeader = request.header('x-deploy-timestamp');
  const signatureHeader = request.header('x-deploy-signature');

  if (!timestampHeader || !signatureHeader) {
    throw new HttpError(401, 'unauthorized', 'Missing required webhook headers');
  }

  const repository =
    typeof request.body?.repository === 'string' ? request.body.repository : undefined;
  if (!repository) {
    throw new HttpError(401, 'unauthorized', 'Missing repository in payload');
  }

  const repoConfig = getRepoConfig(repository);
  if (!repoConfig) {
    throw new HttpError(401, 'unauthorized', 'Unauthorized');
  }

  const timestampMs = parseTimestamp(timestampHeader);
  const now = Date.now();
  const allowedDriftMs = getConfig().server.security.replayWindowSeconds * 1000;
  if (Math.abs(now - timestampMs) > allowedDriftMs) {
    throw new HttpError(401, 'unauthorized', 'Webhook timestamp is outside allowed window');
  }

  const bearerToken = getBearerToken(request);
  if (!safeCompare(bearerToken, repoConfig.webhook.bearerToken)) {
    throw new HttpError(401, 'unauthorized', 'Unauthorized');
  }

  if (!rawRequest.rawBody) {
    throw new HttpError(400, 'invalid_request', 'Raw body is required for webhook validation');
  }

  const payloadToSign = `${timestampHeader}.${rawRequest.rawBody.toString('utf8')}`;
  const expectedSignature = createHmac('sha256', repoConfig.webhook.hmacSecret)
    .update(payloadToSign)
    .digest('hex');

  const receivedSignature = signatureHeader.replace(/^sha256=/, '');
  if (!safeCompare(receivedSignature, expectedSignature)) {
    throw new HttpError(401, 'unauthorized', 'Invalid signature');
  }

  return {
    repository,
  };
}
