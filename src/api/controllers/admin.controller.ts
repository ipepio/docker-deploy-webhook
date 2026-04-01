import { type NextFunction, type Request, type Response } from 'express';

import { getRepoConfig } from '../../config';
import { HttpError } from '../../errors/http-error';
import { type DeployJobPayload } from '../../queue/job.types';
import { enqueueDeployJob, getJob } from '../../queue/queue-manager';
import { readRollbackState } from '../../state/disk.store';
import {
  AdminDeployPayloadSchema,
  AdminRedeployPayloadSchema,
  validateManualDeployAgainstConfig,
} from '../validators/deploy.validator';

function buildAdminPayload(
  repository: string,
  environment: string,
  tag: string,
  force: boolean,
): DeployJobPayload {
  return {
    repository,
    environment,
    tag,
    sha: tag,
    workflow: 'manual',
    refName: 'manual',
    runId: 0,
    triggeredBy: 'admin',
    force,
  };
}

function parseForceValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value === 'true';
  }

  return false;
}

export async function adminDeployController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = AdminDeployPayloadSchema.parse(request.body);
    const repoConfig = getRepoConfig(payload.repository);
    if (!repoConfig) {
      throw new HttpError(404, 'repository_not_found', 'Repository not found');
    }

    validateManualDeployAgainstConfig(payload, repoConfig);

    const enqueueResult = await enqueueDeployJob(
      buildAdminPayload(payload.repository, payload.environment, payload.tag, payload.force),
    );

    response.status(202).json({
      status: 'accepted',
      job_id: enqueueResult.jobId,
      queue_status: enqueueResult.status,
    });
  } catch (error) {
    next(error);
  }
}

export async function adminRedeployLastSuccessfulController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = AdminRedeployPayloadSchema.parse(request.body);
    const repoConfig = getRepoConfig(payload.repository);
    if (!repoConfig || !repoConfig.environments[payload.environment]) {
      throw new HttpError(404, 'repository_not_found', 'Repository or environment not found');
    }

    const rollbackState = readRollbackState(payload.repository, payload.environment);
    if (!rollbackState.successfulTag) {
      throw new HttpError(404, 'no_successful_deployment_found', 'No successful deployment found');
    }

    const enqueueResult = await enqueueDeployJob(
      buildAdminPayload(
        payload.repository,
        payload.environment,
        rollbackState.successfulTag,
        payload.force,
      ),
    );

    response.status(202).json({
      status: 'accepted',
      job_id: enqueueResult.jobId,
      queue_status: enqueueResult.status,
      tag: rollbackState.successfulTag,
    });
  } catch (error) {
    next(error);
  }
}

export async function adminRetryJobController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jobId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
    const job = await getJob(jobId);
    if (!job) {
      throw new HttpError(404, 'job_not_found', 'Job not found');
    }

    if (!['failed', 'rolled_back', 'rollback_failed'].includes(job.status)) {
      throw new HttpError(409, 'job_not_retryable', 'Job is not retryable');
    }

    const force = parseForceValue(request.query.force);
    const enqueueResult = await enqueueDeployJob({
      ...job.payload,
      triggeredBy: 'admin',
      force,
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
