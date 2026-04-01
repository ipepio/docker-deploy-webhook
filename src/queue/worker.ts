import { Worker } from 'bullmq';

import { runDeployEngine } from '../deploy/engine';
import { logger } from '../logger';
import { sendNotification } from '../notifications/notifier';
import { type DeployJobPayload } from './job.types';
import { DEPLOY_QUEUE_NAME } from './queue';
import { getRedisClient } from './redis';
import { getJob, updateJob } from './queue-manager';

let deployWorker: Worker<DeployJobPayload> | null = null;

export function getWorker(): Worker<DeployJobPayload> | null {
  return deployWorker;
}

export function getWorkerStatus(): 'stopped' | 'running' {
  return deployWorker ? 'running' : 'stopped';
}

export function startWorker(): Worker<DeployJobPayload> {
  if (deployWorker) {
    return deployWorker;
  }

  deployWorker = new Worker<DeployJobPayload>(
    DEPLOY_QUEUE_NAME,
    async (bullJob) => {
      const jobId = bullJob.id;
      if (!jobId) {
        throw new Error('BullMQ job id is missing');
      }

      const deploymentJob = await getJob(jobId);
      if (!deploymentJob) {
        throw new Error(`Deployment job not found for id ${jobId}`);
      }

      await updateJob(jobId, {
        status: 'running',
        startedAt: new Date().toISOString(),
      });

      const executionResult = await runDeployEngine(deploymentJob);
      const updatedJob = await updateJob(jobId, {
        status: executionResult.status,
        finishedAt: new Date().toISOString(),
        durationMs: executionResult.durationMs,
        error: executionResult.error,
        rollbackTag: executionResult.rollbackTag,
        logs: executionResult.logs,
      });

      await sendNotification(updatedJob, executionResult);
      return executionResult;
    },
    {
      connection: getRedisClient(),
      concurrency: 1,
      autorun: true,
    },
  );

  deployWorker.on('failed', (bullJob, error) => {
    logger.error('Worker failed while processing deployment job', {
      jobId: bullJob?.id,
      error: String(error),
    });
  });

  return deployWorker;
}

export async function closeWorker(): Promise<void> {
  if (deployWorker) {
    await deployWorker.close();
    deployWorker = null;
  }
}
