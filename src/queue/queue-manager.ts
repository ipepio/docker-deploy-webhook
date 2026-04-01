import { type Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

import { getConfig } from '../config';
import { logger } from '../logger';
import {
  type DeployJob,
  type DeployJobPayload,
  type EnqueueResult,
  type JobStatus,
} from './job.types';
import { RedisKeys } from './keys';
import { getDeployQueue } from './queue';
import { getRedisClient } from './redis';

function isTerminalStatus(status: JobStatus): boolean {
  return ['success', 'failed', 'rolled_back', 'rollback_failed', 'cancelled'].includes(status);
}

function getJobTtlSeconds(): number {
  return getConfig().server.history.ttlSeconds;
}

export function createDeployJob(payload: DeployJobPayload): DeployJob {
  return {
    id: uuidv4(),
    payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
    logs: [],
  };
}

export async function getJob(jobId: string): Promise<DeployJob | null> {
  const rawJob = await getRedisClient().get(RedisKeys.job(jobId));
  if (!rawJob) {
    return null;
  }

  return JSON.parse(rawJob) as DeployJob;
}

async function persistJob(job: DeployJob): Promise<void> {
  await getRedisClient().set(RedisKeys.job(job.id), JSON.stringify(job), 'EX', getJobTtlSeconds());
}

async function getBullJobById(jobId: string): Promise<Job<DeployJobPayload> | undefined> {
  return getDeployQueue().getJob(jobId);
}

async function addToRecentJobs(job: DeployJob): Promise<void> {
  const redis = getRedisClient();
  const { repository, environment } = job.payload;
  const ttl = getJobTtlSeconds();

  const recentKey = RedisKeys.recent(repository, environment);
  const recentAllKey = RedisKeys.recentAll();
  const maxJobs = getConfig().server.history.maxJobs;

  await redis
    .multi()
    .lpush(recentKey, job.id)
    .ltrim(recentKey, 0, maxJobs - 1)
    .expire(recentKey, ttl)
    .lpush(recentAllKey, job.id)
    .ltrim(recentAllKey, 0, maxJobs - 1)
    .expire(recentAllKey, ttl)
    .exec();
}

async function cancelPendingBullJob(jobId: string): Promise<void> {
  const bullJob = await getBullJobById(jobId);
  if (bullJob) {
    try {
      await bullJob.remove();
    } catch (error) {
      logger.warn('Failed to remove BullMQ waiting job', {
        jobId,
        error: String(error),
      });
    }
  }
}

async function markJobCancelled(job: DeployJob): Promise<void> {
  const cancelledJob: DeployJob = {
    ...job,
    status: 'cancelled',
    finishedAt: new Date().toISOString(),
  };

  await persistJob(cancelledJob);
  await addToRecentJobs(cancelledJob);
}

async function getPendingJob(repository: string, environment: string): Promise<DeployJob | null> {
  const pendingId = await getRedisClient().get(RedisKeys.pending(repository, environment));
  if (!pendingId) {
    return null;
  }
  return getJob(pendingId);
}

async function getRunningJob(): Promise<DeployJob | null> {
  const runningId = await getRedisClient().get(RedisKeys.running());
  if (!runningId) {
    return null;
  }
  return getJob(runningId);
}

export async function updateJob(jobId: string, updates: Partial<DeployJob>): Promise<DeployJob> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const updatedJob: DeployJob = {
    ...job,
    ...updates,
  };

  await persistJob(updatedJob);

  const redis = getRedisClient();
  const pendingKey = RedisKeys.pending(
    updatedJob.payload.repository,
    updatedJob.payload.environment,
  );

  if (updatedJob.status === 'running') {
    await redis.set(RedisKeys.running(), updatedJob.id, 'EX', getJobTtlSeconds());
    const currentPending = await redis.get(pendingKey);
    if (currentPending === updatedJob.id) {
      await redis.del(pendingKey);
    }
  }

  if (isTerminalStatus(updatedJob.status)) {
    const currentPending = await redis.get(pendingKey);
    if (currentPending === updatedJob.id) {
      await redis.del(pendingKey);
    }

    const runningId = await redis.get(RedisKeys.running());
    if (runningId === updatedJob.id) {
      await redis.del(RedisKeys.running());
    }

    await addToRecentJobs(updatedJob);
  }

  return updatedJob;
}

export async function enqueueDeployJob(payload: DeployJobPayload): Promise<EnqueueResult> {
  const redis = getRedisClient();
  const pendingKey = RedisKeys.pending(payload.repository, payload.environment);

  const pendingJob = await getPendingJob(payload.repository, payload.environment);
  if (pendingJob) {
    if (pendingJob.payload.tag === payload.tag && !payload.force) {
      return {
        status: 'ignored_duplicate',
        jobId: pendingJob.id,
      };
    }

    await markJobCancelled(pendingJob);
    await cancelPendingBullJob(pendingJob.id);
    await redis.del(pendingKey);
  }

  const runningJob = await getRunningJob();
  if (
    runningJob &&
    runningJob.payload.repository === payload.repository &&
    runningJob.payload.environment === payload.environment &&
    runningJob.payload.tag === payload.tag &&
    !payload.force
  ) {
    return {
      status: 'ignored_duplicate',
      jobId: runningJob.id,
    };
  }

  const deployJob = createDeployJob(payload);

  await persistJob(deployJob);
  await redis.set(pendingKey, deployJob.id, 'EX', getJobTtlSeconds());
  await getDeployQueue().add('deploy', payload, {
    jobId: deployJob.id,
  });

  logger.info('Deployment job enqueued', {
    jobId: deployJob.id,
    repository: payload.repository,
    environment: payload.environment,
    tag: payload.tag,
    triggeredBy: payload.triggeredBy,
  });

  return {
    status: pendingJob ? 'replaced_pending' : 'enqueued',
    jobId: deployJob.id,
  };
}

export async function getRecentJobs(
  repository?: string,
  environment?: string,
  limit = 20,
): Promise<DeployJob[]> {
  const redis = getRedisClient();
  const redisKey =
    repository && environment ? RedisKeys.recent(repository, environment) : RedisKeys.recentAll();

  const ids = await redis.lrange(redisKey, 0, Math.max(limit - 1, 0));
  const jobs = await Promise.all(ids.map((jobId) => getJob(jobId)));
  return jobs.filter((job): job is DeployJob => job !== null);
}
