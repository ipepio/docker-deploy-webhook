import { logger } from '../logger';
import { RedisKeys } from './keys';
import { getRedisClient } from './redis';
import { getJob, updateJob } from './queue-manager';

export async function recoverInterruptedJobs(): Promise<void> {
  const redis = getRedisClient();
  const runningJobId = await redis.get(RedisKeys.running());
  if (!runningJobId) {
    return;
  }

  const runningJob = await getJob(runningJobId);
  if (!runningJob) {
    await redis.del(RedisKeys.running());
    return;
  }

  if (runningJob.status === 'running') {
    logger.warn('Interrupted running job detected during startup', {
      jobId: runningJobId,
      repository: runningJob.payload.repository,
      environment: runningJob.payload.environment,
    });
    await updateJob(runningJobId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      error: 'Service restarted while deployment was running',
    });
  }

  await redis.del(RedisKeys.running());
}
