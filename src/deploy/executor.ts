import { execFile } from 'child_process';
import { promisify } from 'util';

import { logger } from '../logger';
import { TimeoutError } from './errors';
import { type ExecResult } from './types';

const execFileAsync = promisify(execFile);

export interface RunDockerComposeOptions {
  timeoutMs: number;
  jobId: string;
  step: string;
}

type ExecFileFailure = NodeJS.ErrnoException & {
  stdout?: string;
  stderr?: string;
  code?: number | string;
  name?: string;
};

export async function runDockerCompose(
  args: string[],
  options: RunDockerComposeOptions,
): Promise<ExecResult> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), options.timeoutMs);

  try {
    const { stdout, stderr } = await execFileAsync('docker', ['compose', ...args], {
      signal: abortController.signal,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error) {
    const execError = error as ExecFileFailure;

    if (execError.name === 'AbortError') {
      throw new TimeoutError(`Step ${options.step} timed out after ${options.timeoutMs}ms`);
    }

    logger.warn('docker compose command failed', {
      jobId: options.jobId,
      step: options.step,
      code: execError.code,
      stderr: execError.stderr,
    });

    return {
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? '',
      exitCode: typeof execError.code === 'number' ? execError.code : 1,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}
