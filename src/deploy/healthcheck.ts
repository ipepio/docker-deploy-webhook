import axios from 'axios';

import { sleep } from '../utils/sleep';
import { HealthcheckError } from './errors';
import { type DeployContext } from './types';

export async function waitForHealthcheck(context: DeployContext): Promise<void> {
  if (!context.healthcheck.enabled || !context.healthcheck.url) {
    return;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt <= context.healthcheck.timeoutMs) {
    try {
      const response = await axios.get(context.healthcheck.url, {
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      if (response.status >= 200 && response.status < 300) {
        return;
      }
    } catch {
      // Healthcheck not ready yet.
    }

    await sleep(context.healthcheck.intervalMs);
  }

  throw new HealthcheckError(
    `Healthcheck failed after ${context.healthcheck.timeoutMs}ms for ${context.healthcheck.url}`,
  );
}
