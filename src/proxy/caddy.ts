import { execFile, execSync } from 'child_process';
import { promisify } from 'util';

import { logger } from '../logger';

const execFileAsync = promisify(execFile);

const CADDY_ADMIN_URL = 'http://localhost:2019/config/';
const DEPCTL_PROXY_NETWORK = 'depctl-proxy';

async function dockerCompose(...args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('docker', ['compose', ...args]);
}

export async function startCaddy(): Promise<void> {
  await dockerCompose('up', '-d', 'caddy');
  logger.info('Caddy started');
}

export async function stopCaddy(): Promise<void> {
  await dockerCompose('stop', 'caddy');
  logger.info('Caddy stopped');
}

export async function isCaddyRunning(): Promise<boolean> {
  try {
    execSync(`curl -sf --max-time 3 ${CADDY_ADMIN_URL}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export async function ensureProxyNetwork(): Promise<void> {
  try {
    execSync(`docker network inspect ${DEPCTL_PROXY_NETWORK}`, { stdio: 'pipe' });
  } catch {
    execSync(`docker network create ${DEPCTL_PROXY_NETWORK}`, { stdio: 'pipe' });
    logger.info('Created Docker network', { network: DEPCTL_PROXY_NETWORK });
  }
}

export { DEPCTL_PROXY_NETWORK };
