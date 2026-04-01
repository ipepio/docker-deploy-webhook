import { createHmac } from 'crypto';
import { type Request } from 'express';

import { initConfig, resetConfig } from '../config';
import { HttpError } from '../errors/http-error';
import { createTempConfigFixture } from '../test-utils/temp-config';
import { authenticateWebhook } from './webhook.auth';

function buildRequest(input: {
  body: Record<string, unknown>;
  rawBody: Buffer;
  headers: Record<string, string>;
}): Request {
  return {
    body: input.body,
    rawBody: input.rawBody,
    header(name: string) {
      return input.headers[name.toLowerCase()];
    },
  } as unknown as Request;
}

describe('authenticateWebhook', () => {
  afterEach(() => {
    resetConfig();
    delete process.env.TEST_ADMIN_READ_TOKEN;
    delete process.env.TEST_ADMIN_WRITE_TOKEN;
    delete process.env.TEST_REPO_BEARER;
    delete process.env.TEST_REPO_HMAC;
    delete process.env.STATE_DIR;
  });

  it('accepts a valid webhook request', async () => {
    const fixture = createTempConfigFixture();
    process.env.TEST_ADMIN_READ_TOKEN = 'read-token';
    process.env.TEST_ADMIN_WRITE_TOKEN = 'write-token';
    process.env.TEST_REPO_BEARER = 'repo-bearer';
    process.env.TEST_REPO_HMAC = 'repo-hmac';
    process.env.STATE_DIR = `${fixture.rootDir}/state`;
    await initConfig({
      serverConfigPath: fixture.serverConfigPath,
      reposConfigPath: fixture.reposConfigPath,
    });

    const payload = {
      repository: fixture.repository,
      environment: fixture.environment,
      tag: 'sha-abc1234',
      sha: 'abc1234',
      workflow: 'deploy-production',
      ref_name: 'main',
      run_id: 123,
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', 'repo-hmac')
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');

    const request = buildRequest({
      body: payload,
      rawBody,
      headers: {
        authorization: 'Bearer repo-bearer',
        'x-deploy-timestamp': timestamp,
        'x-deploy-signature': `sha256=${signature}`,
      },
    });

    expect(() => authenticateWebhook(request)).not.toThrow();
    fixture.cleanup();
  });

  it('rejects an invalid signature', async () => {
    const fixture = createTempConfigFixture();
    process.env.TEST_ADMIN_READ_TOKEN = 'read-token';
    process.env.TEST_ADMIN_WRITE_TOKEN = 'write-token';
    process.env.TEST_REPO_BEARER = 'repo-bearer';
    process.env.TEST_REPO_HMAC = 'repo-hmac';
    process.env.STATE_DIR = `${fixture.rootDir}/state`;
    await initConfig({
      serverConfigPath: fixture.serverConfigPath,
      reposConfigPath: fixture.reposConfigPath,
    });

    const payload = {
      repository: fixture.repository,
      environment: fixture.environment,
      tag: 'sha-abc1234',
      sha: 'abc1234',
      workflow: 'deploy-production',
      ref_name: 'main',
      run_id: 123,
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000));

    const request = buildRequest({
      body: payload,
      rawBody,
      headers: {
        authorization: 'Bearer repo-bearer',
        'x-deploy-timestamp': timestamp,
        'x-deploy-signature': 'sha256=invalid',
      },
    });

    expect(() => authenticateWebhook(request)).toThrow(HttpError);
    fixture.cleanup();
  });

  it('rejects an expired timestamp', async () => {
    const fixture = createTempConfigFixture();
    process.env.TEST_ADMIN_READ_TOKEN = 'read-token';
    process.env.TEST_ADMIN_WRITE_TOKEN = 'write-token';
    process.env.TEST_REPO_BEARER = 'repo-bearer';
    process.env.TEST_REPO_HMAC = 'repo-hmac';
    process.env.STATE_DIR = `${fixture.rootDir}/state`;
    await initConfig({
      serverConfigPath: fixture.serverConfigPath,
      reposConfigPath: fixture.reposConfigPath,
    });

    const payload = {
      repository: fixture.repository,
      environment: fixture.environment,
      tag: 'sha-abc1234',
      sha: 'abc1234',
      workflow: 'deploy-production',
      ref_name: 'main',
      run_id: 123,
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000) - 3600);
    const signature = createHmac('sha256', 'repo-hmac')
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');

    const request = buildRequest({
      body: payload,
      rawBody,
      headers: {
        authorization: 'Bearer repo-bearer',
        'x-deploy-timestamp': timestamp,
        'x-deploy-signature': `sha256=${signature}`,
      },
    });

    expect(() => authenticateWebhook(request)).toThrow(HttpError);
    fixture.cleanup();
  });
});
