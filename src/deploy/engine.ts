import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

import { getConfig, getRepoConfig } from '../config';
import { logger } from '../logger';
import { readRollbackState, writeRollbackState } from '../state/disk.store';
import { HealthcheckError, PullError, UpError } from './errors';
import { runDockerCompose } from './executor';
import { waitForHealthcheck } from './healthcheck';
import { withRetry } from './retry';
import {
  type DeployContext,
  type DeployResult,
  type ResolvedHealthcheck,
  type ResolvedTimeouts,
} from './types';
import { type DeployJob } from '../queue/job.types';

type StepLogger = (message: string) => void;

function resolveTimeouts(job: DeployJob): ResolvedTimeouts {
  const config = getConfig();
  const repoConfig = getRepoConfig(job.payload.repository);
  if (!repoConfig) {
    throw new Error(`Repository config not found: ${job.payload.repository}`);
  }

  const environmentConfig = repoConfig.environments[job.payload.environment];
  if (!environmentConfig) {
    throw new Error(`Environment config not found: ${job.payload.environment}`);
  }

  return {
    pullTimeoutMs:
      environmentConfig.timeouts?.pullTimeoutMs ?? config.server.defaults.pullTimeoutMs,
    upTimeoutMs: environmentConfig.timeouts?.upTimeoutMs ?? config.server.defaults.upTimeoutMs,
    healthcheckTimeoutMs:
      environmentConfig.timeouts?.healthcheckTimeoutMs ??
      config.server.defaults.healthcheckTimeoutMs,
    healthcheckIntervalMs:
      environmentConfig.timeouts?.healthcheckIntervalMs ??
      config.server.defaults.healthcheckIntervalMs,
    retryAttempts:
      environmentConfig.timeouts?.retryAttempts ?? config.server.defaults.retryAttempts,
    retryBackoffMs:
      environmentConfig.timeouts?.retryBackoffMs ?? config.server.defaults.retryBackoffMs,
  };
}

function resolveHealthcheck(job: DeployJob, timeouts: ResolvedTimeouts): ResolvedHealthcheck {
  const repoConfig = getRepoConfig(job.payload.repository);
  if (!repoConfig) {
    throw new Error(`Repository config not found: ${job.payload.repository}`);
  }

  const environmentConfig = repoConfig.environments[job.payload.environment];
  if (!environmentConfig) {
    throw new Error(`Environment config not found: ${job.payload.environment}`);
  }

  return {
    enabled: environmentConfig.healthcheck.enabled,
    url: environmentConfig.healthcheck.url,
    timeoutMs: environmentConfig.healthcheck.timeoutMs ?? timeouts.healthcheckTimeoutMs,
    intervalMs: environmentConfig.healthcheck.intervalMs ?? timeouts.healthcheckIntervalMs,
  };
}

export function resolveDeployContext(job: DeployJob): DeployContext {
  const repoConfig = getRepoConfig(job.payload.repository);
  if (!repoConfig) {
    throw new Error(`Repository config not found: ${job.payload.repository}`);
  }

  const environmentConfig = repoConfig.environments[job.payload.environment];
  if (!environmentConfig) {
    throw new Error(`Environment config not found: ${job.payload.environment}`);
  }

  const timeouts = resolveTimeouts(job);

  return {
    jobId: job.id,
    repository: job.payload.repository,
    environment: job.payload.environment,
    tag: job.payload.tag,
    imageName: environmentConfig.imageName,
    composeFile: environmentConfig.composeFile,
    runtimeEnvFile: environmentConfig.runtimeEnvFile,
    services: environmentConfig.services,
    timeouts,
    healthcheck: resolveHealthcheck(job, timeouts),
  };
}

export function writeRuntimeEnvFile(context: DeployContext): void {
  mkdirSync(dirname(context.runtimeEnvFile), { recursive: true });
  writeFileSync(
    context.runtimeEnvFile,
    `IMAGE_NAME=${context.imageName}\nIMAGE_TAG=${context.tag}\n`,
    'utf8',
  );
}

async function runPull(context: DeployContext, log: StepLogger): Promise<void> {
  const result = await runDockerCompose(
    ['-f', context.composeFile, '--env-file', context.runtimeEnvFile, 'pull', ...context.services],
    {
      timeoutMs: context.timeouts.pullTimeoutMs,
      jobId: context.jobId,
      step: 'pull',
    },
  );

  if (result.stdout.trim().length > 0) {
    log(result.stdout.trim());
  }
  if (result.stderr.trim().length > 0) {
    log(result.stderr.trim());
  }

  if (result.exitCode !== 0) {
    throw new PullError(result.stderr || `docker compose pull failed with code ${result.exitCode}`);
  }
}

async function runUp(context: DeployContext, log: StepLogger): Promise<void> {
  const result = await runDockerCompose(
    [
      '-f',
      context.composeFile,
      '--env-file',
      context.runtimeEnvFile,
      'up',
      '-d',
    ],
    {
      timeoutMs: context.timeouts.upTimeoutMs,
      jobId: context.jobId,
      step: 'up',
    },
  );

  if (result.stdout.trim().length > 0) {
    log(result.stdout.trim());
  }
  if (result.stderr.trim().length > 0) {
    log(result.stderr.trim());
  }

  if (result.exitCode !== 0) {
    throw new UpError(result.stderr || `docker compose up failed with code ${result.exitCode}`);
  }
}

async function runRollback(
  context: DeployContext,
  rollbackTag: string,
  log: StepLogger,
): Promise<void> {
  const rollbackContext: DeployContext = {
    ...context,
    tag: rollbackTag,
  };

  writeRuntimeEnvFile(rollbackContext);
  log(`Rollback runtime env written for tag ${rollbackTag}`);
  await runPull(rollbackContext, log);
  await runUp(rollbackContext, log);
}

function buildStepLogger(
  jobId: string,
  repository: string,
  environment: string,
  logs: string[],
): StepLogger {
  return (message: string) => {
    const line = `[${new Date().toISOString()}] ${message}`;
    logs.push(line);
    logger.info(message, {
      jobId,
      repository,
      environment,
    });
  };
}

export async function runDeployEngine(job: DeployJob): Promise<DeployResult> {
  const startedAt = Date.now();
  const logs: string[] = [];
  const log = buildStepLogger(job.id, job.payload.repository, job.payload.environment, logs);
  const context = resolveDeployContext(job);
  const rollbackState = readRollbackState(job.payload.repository, job.payload.environment);
  const previousTag = rollbackState.successfulTag;

  log(
    `Starting deployment for ${job.payload.repository} ${job.payload.environment} ${job.payload.tag}`,
  );
  log(`Previous successful tag: ${previousTag ?? 'none'}`);

  writeRuntimeEnvFile(context);
  log(`Runtime env file written at ${context.runtimeEnvFile}`);

  try {
    await withRetry(() => runPull(context, log), {
      retryAttempts: context.timeouts.retryAttempts,
      retryBackoffMs: context.timeouts.retryBackoffMs,
    });

    await runUp(context, log);

    if (context.healthcheck.enabled) {
      await waitForHealthcheck(context);
      log(`Healthcheck passed for ${context.healthcheck.url}`);
    }

    writeRollbackState(job.payload.repository, job.payload.environment, {
      successfulTag: job.payload.tag,
      previousTag,
      deployedAt: new Date().toISOString(),
      jobId: job.id,
    });

    log('Deployment completed successfully');

    return {
      status: 'success',
      durationMs: Date.now() - startedAt,
      logs,
    };
  } catch (error) {
    log(`Deployment failed: ${String(error)}`);

    if (!previousTag) {
      return {
        status: 'failed',
        durationMs: Date.now() - startedAt,
        error: String(error),
        logs,
      };
    }

    try {
      log(`Attempting rollback to ${previousTag}`);
      await runRollback(context, previousTag, log);

      if (context.healthcheck.enabled) {
        await waitForHealthcheck({
          ...context,
          tag: previousTag,
        });
        log(`Rollback healthcheck passed for ${context.healthcheck.url}`);
      }

      writeRollbackState(job.payload.repository, job.payload.environment, {
        successfulTag: previousTag,
        previousTag: rollbackState.previousTag,
        deployedAt: new Date().toISOString(),
        jobId: job.id,
      });

      return {
        status: 'rolled_back',
        durationMs: Date.now() - startedAt,
        error: String(error),
        rollbackTag: previousTag,
        logs,
      };
    } catch (rollbackError) {
      const rollbackMessage = String(rollbackError);
      log(`Rollback failed: ${rollbackMessage}`);

      return {
        status: 'rollback_failed',
        durationMs: Date.now() - startedAt,
        error: `${String(error)} | ${rollbackMessage}`,
        rollbackTag: previousTag,
        logs,
      };
    }
  }
}

export { HealthcheckError, PullError, UpError };
