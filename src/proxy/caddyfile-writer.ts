import { execFile } from 'child_process';
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { promisify } from 'util';

import { type CaddyfileContext, generateCaddyfile } from './caddyfile';
import { listRepoFiles } from '../config/repo-files';
import { resolveConfigPaths } from '../config/paths';
import { logger } from '../logger';

const execFileAsync = promisify(execFile);

export function resolveCaddyfilePath(): string {
  const { serverConfigPath } = resolveConfigPaths();
  return `${dirname(serverConfigPath)}/Caddyfile`;
}

export async function validateCaddyfileContent(content: string): Promise<void> {
  const tmpPath = `${resolveCaddyfilePath()}.tmp`;
  writeFileSync(tmpPath, content, 'utf8');

  try {
    await execFileAsync('docker', [
      'compose',
      'exec',
      '-T',
      'caddy',
      'caddy',
      'validate',
      '--config',
      '/etc/caddy/Caddyfile.tmp',
    ]);
  } catch (err) {
    const error = err as { stderr?: string; message?: string };
    try {
      unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    throw new Error(`Caddyfile validation failed: ${error.stderr ?? error.message ?? String(err)}`);
  }
}

export function writeCaddyfileAtomic(content: string): void {
  const target = resolveCaddyfilePath();
  const tmp = `${target}.tmp`;

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(tmp, content, 'utf8');

  try {
    renameSync(tmp, target);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

export async function reloadCaddy(): Promise<void> {
  try {
    await execFileAsync('docker', [
      'compose',
      'exec',
      '-T',
      'caddy',
      'caddy',
      'reload',
      '--config',
      '/etc/caddy/Caddyfile',
    ]);
    logger.info('Caddy reloaded');
  } catch (err) {
    const error = err as { stderr?: string };
    throw new Error(`Caddy reload failed: ${error.stderr ?? String(err)}`);
  }
}

export async function rebuildAndReload(context?: Partial<CaddyfileContext>): Promise<void> {
  const repoFiles = listRepoFiles();
  const repos = repoFiles.map((f) => f.repoYaml);

  const full: CaddyfileContext = {
    repos,
    fallbackIp: context?.fallbackIp,
    acmeEmail: context?.acmeEmail,
  };

  const content = generateCaddyfile(full);
  writeCaddyfileAtomic(content);

  if (!existsSync(resolveCaddyfilePath())) return;

  try {
    await reloadCaddy();
  } catch (err) {
    logger.warn('Caddy reload failed after Caddyfile write', { error: String(err) });
    throw err;
  }
}
