import { type Request, type Response } from 'express';

import { getConfig } from '../../config';
import { getWorkerStatus } from '../../queue/worker';
import { getDeployQueue } from '../../queue/queue';
import { pingRedis } from '../../queue/redis';

export async function healthController(_request: Request, response: Response): Promise<void> {
  const config = getConfig();

  try {
    await pingRedis();
    const queue = getDeployQueue();
    const [pending, running] = await Promise.all([queue.getWaitingCount(), queue.getActiveCount()]);

    response.status(200).json({
      status: 'ok',
      server_id: config.server.id,
      uptime_seconds: Math.round(process.uptime()),
      redis: 'connected',
      worker: getWorkerStatus(),
      queue: {
        pending,
        running,
      },
      version: '0.1.0',
    });
  } catch {
    response.status(503).json({
      status: 'degraded',
      server_id: config.server.id,
      uptime_seconds: Math.round(process.uptime()),
      redis: 'disconnected',
      worker: getWorkerStatus(),
      queue: {
        pending: 0,
        running: 0,
      },
      version: '0.1.0',
    });
  }
}
