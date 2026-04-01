import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

import { type RollbackState } from '../deploy/types';

function getStateDirectory(): string {
  return resolve(process.env.STATE_DIR ?? './data/state');
}

function getStatePath(repository: string, environment: string): string {
  const [owner, repo] = repository.split('/');
  return join(getStateDirectory(), owner, repo, `${environment}.json`);
}

export function readRollbackState(repository: string, environment: string): RollbackState {
  const filePath = getStatePath(repository, environment);
  if (!existsSync(filePath)) {
    return {
      successfulTag: null,
      previousTag: null,
      deployedAt: null,
      jobId: null,
    };
  }

  return JSON.parse(readFileSync(filePath, 'utf8')) as RollbackState;
}

export function writeRollbackState(
  repository: string,
  environment: string,
  rollbackState: RollbackState,
): void {
  const filePath = getStatePath(repository, environment);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(rollbackState, null, 2)}\n`, 'utf8');
}
