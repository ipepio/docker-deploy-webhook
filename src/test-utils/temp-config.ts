import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export interface TempConfigFixture {
  rootDir: string;
  serverConfigPath: string;
  reposConfigPath: string;
  composeFilePath: string;
  runtimeEnvFilePath: string;
  repository: string;
  environment: string;
  imageName: string;
  cleanup: () => void;
}

export function createTempConfigFixture(options?: {
  repository?: string;
  environment?: string;
  healthcheckEnabled?: boolean;
}): TempConfigFixture {
  const repository = options?.repository ?? 'acme/test-app';
  const environment = options?.environment ?? 'production';
  const imageName = `ghcr.io/${repository}`;
  const rootDir = mkdtempSync(join(tmpdir(), 'docker-deploy-webhook-'));
  const configDir = join(rootDir, 'config');
  const reposConfigPath = join(configDir, 'repos');
  const stackDir = join(rootDir, 'stack');
  const runtimeEnvDir = join(stackDir, 'env');
  const serverConfigPath = join(configDir, 'server.yml');
  const composeFilePath = join(stackDir, 'docker-compose.yml');
  const runtimeEnvFilePath = join(runtimeEnvDir, '.deploy.env');

  mkdirSync(reposConfigPath, { recursive: true });
  mkdirSync(stackDir, { recursive: true });
  mkdirSync(runtimeEnvDir, { recursive: true });

  writeFileSync(
    composeFilePath,
    'services:\n  api:\n    image: ${IMAGE_NAME}:${IMAGE_TAG}\n',
    'utf8',
  );

  writeFileSync(
    serverConfigPath,
    [
      'server:',
      '  id: test-server',
      '  port: 8080',
      '  history:',
      '    max_jobs: 50',
      '    ttl_seconds: 3600',
      '  rate_limit:',
      '    webhook_per_minute: 30',
      '    admin_per_minute: 60',
      '  security:',
      '    replay_window_seconds: 300',
      '    admin_read_token_env: TEST_ADMIN_READ_TOKEN',
      '    admin_write_token_env: TEST_ADMIN_WRITE_TOKEN',
      '  defaults:',
      '    pull_timeout_ms: 1000',
      '    up_timeout_ms: 1000',
      '    healthcheck_timeout_ms: 1000',
      '    healthcheck_interval_ms: 50',
      '    retry_attempts: 1',
      '    retry_backoff_ms: 10',
      '  notifications:',
      '    telegram:',
      '      enabled: false',
      '      chat_ids: []',
      '    email:',
      '      enabled: false',
      '      recipients: []',
      '',
    ].join('\n'),
    'utf8',
  );

  writeFileSync(
    join(reposConfigPath, 'repo.yml'),
    [
      `repository: ${repository}`,
      'webhook:',
      '  bearer_token_env: TEST_REPO_BEARER',
      '  hmac_secret_env: TEST_REPO_HMAC',
      'environments:',
      `  ${environment}:`,
      `    image_name: ${imageName}`,
      `    compose_file: ${composeFilePath}`,
      `    runtime_env_file: ${runtimeEnvFilePath}`,
      '    services:',
      '      - api',
      '    allowed_workflows:',
      '      - deploy-production',
      '    allowed_branches:',
      '      - main',
      '    allowed_tag_pattern: ^sha-[a-z0-9]{7,40}$',
      '    healthcheck:',
      `      enabled: ${options?.healthcheckEnabled ? 'true' : 'false'}`,
      `      url: http://127.0.0.1:3000/health`,
      '',
    ].join('\n'),
    'utf8',
  );

  return {
    rootDir,
    serverConfigPath,
    reposConfigPath,
    composeFilePath,
    runtimeEnvFilePath,
    repository,
    environment,
    imageName,
    cleanup: () => {
      rmSync(rootDir, { recursive: true, force: true });
    },
  };
}
