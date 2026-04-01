import { Queue } from 'bullmq';

import { type DeployJobPayload } from './job.types';
import { getRedisClient } from './redis';

export const DEPLOY_QUEUE_NAME = 'deploy-jobs';

let deployQueueInstance: Queue<DeployJobPayload> | null = null;

export function getDeployQueue(): Queue<DeployJobPayload> {
  if (!deployQueueInstance) {
    deployQueueInstance = new Queue<DeployJobPayload>(DEPLOY_QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    });
  }

  return deployQueueInstance;
}

export async function closeDeployQueue(): Promise<void> {
  if (deployQueueInstance) {
    await deployQueueInstance.close();
    deployQueueInstance = null;
  }
}
