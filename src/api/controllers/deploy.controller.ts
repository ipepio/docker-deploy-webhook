import { type NextFunction, type Request, type Response } from 'express';

import { getRepoConfig } from '../../config';
import { authenticateWebhook } from '../../auth/webhook.auth';
import { logger } from '../../logger';
import { enqueueDeployJob } from '../../queue/queue-manager';
import { DeployPayloadSchema, validateDeployAgainstConfig } from '../validators/deploy.validator';

export async function deployController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { repository } = authenticateWebhook(request);
    const payload = DeployPayloadSchema.parse(request.body);
    const repoConfig = getRepoConfig(repository);

    if (!repoConfig) {
      throw new Error(`Repository config not found after auth: ${repository}`);
    }

    validateDeployAgainstConfig(payload, repoConfig);

    const enqueueResult = await enqueueDeployJob({
      repository: payload.repository,
      environment: payload.environment,
      tag: payload.tag,
      sha: payload.sha,
      workflow: payload.workflow,
      refName: payload.ref_name,
      runId: payload.run_id,
      triggeredBy: 'webhook',
      force: false,
    });

    logger.info('Webhook deployment accepted', {
      repository: payload.repository,
      environment: payload.environment,
      tag: payload.tag,
      runId: payload.run_id,
      jobId: enqueueResult.jobId,
      status: enqueueResult.status,
    });

    response.status(202).json({
      status: 'accepted',
      job_id: enqueueResult.jobId,
      queue_status: enqueueResult.status,
    });
  } catch (error) {
    next(error);
  }
}
