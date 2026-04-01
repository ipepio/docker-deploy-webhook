import { readFileSync } from 'fs';

import { initConfig, resetConfig } from '../config';
import { type DeployJob } from '../queue/job.types';
import { writeRollbackState } from '../state/disk.store';
import { createTempConfigFixture } from '../test-utils/temp-config';
import { runDeployEngine } from './engine';
import { runDockerCompose } from './executor';
import { waitForHealthcheck } from './healthcheck';

jest.mock('./executor', () => ({
  runDockerCompose: jest.fn(),
}));

jest.mock('./healthcheck', () => ({
  waitForHealthcheck: jest.fn(),
}));

const mockedRunDockerCompose = runDockerCompose as jest.MockedFunction<typeof runDockerCompose>;
const mockedWaitForHealthcheck = waitForHealthcheck as jest.MockedFunction<
  typeof waitForHealthcheck
>;

function createJob(fixture: ReturnType<typeof createTempConfigFixture>, tag: string): DeployJob {
  return {
    id: 'job-1',
    payload: {
      repository: fixture.repository,
      environment: fixture.environment,
      tag,
      sha: tag,
      workflow: 'deploy-production',
      refName: 'main',
      runId: 123,
      triggeredBy: 'webhook',
      force: false,
    },
    status: 'running',
    createdAt: new Date().toISOString(),
    logs: [],
  };
}

describe('runDeployEngine', () => {
  afterEach(() => {
    jest.resetAllMocks();
    resetConfig();
    delete process.env.TEST_ADMIN_READ_TOKEN;
    delete process.env.TEST_ADMIN_WRITE_TOKEN;
    delete process.env.TEST_REPO_BEARER;
    delete process.env.TEST_REPO_HMAC;
    delete process.env.STATE_DIR;
  });

  it('completes a successful deployment', async () => {
    const fixture = createTempConfigFixture({ healthcheckEnabled: true });
    process.env.TEST_ADMIN_READ_TOKEN = 'read-token';
    process.env.TEST_ADMIN_WRITE_TOKEN = 'write-token';
    process.env.TEST_REPO_BEARER = 'repo-bearer';
    process.env.TEST_REPO_HMAC = 'repo-hmac';
    process.env.STATE_DIR = `${fixture.rootDir}/state`;
    await initConfig({
      serverConfigPath: fixture.serverConfigPath,
      reposConfigPath: fixture.reposConfigPath,
    });

    mockedRunDockerCompose.mockResolvedValueOnce({ stdout: 'pulled', stderr: '', exitCode: 0 });
    mockedRunDockerCompose.mockResolvedValueOnce({ stdout: 'up', stderr: '', exitCode: 0 });
    mockedWaitForHealthcheck.mockResolvedValue();

    const result = await runDeployEngine(createJob(fixture, 'sha-abc1234'));

    expect(result.status).toBe('success');
    expect(readFileSync(fixture.runtimeEnvFilePath, 'utf8')).toContain('IMAGE_TAG=sha-abc1234');

    fixture.cleanup();
  });

  it('rolls back to the previous tag when deployment fails after applying the new tag', async () => {
    const fixture = createTempConfigFixture({ healthcheckEnabled: true });
    process.env.TEST_ADMIN_READ_TOKEN = 'read-token';
    process.env.TEST_ADMIN_WRITE_TOKEN = 'write-token';
    process.env.TEST_REPO_BEARER = 'repo-bearer';
    process.env.TEST_REPO_HMAC = 'repo-hmac';
    process.env.STATE_DIR = `${fixture.rootDir}/state`;
    await initConfig({
      serverConfigPath: fixture.serverConfigPath,
      reposConfigPath: fixture.reposConfigPath,
    });

    writeRollbackState(fixture.repository, fixture.environment, {
      successfulTag: 'sha-old123',
      previousTag: null,
      deployedAt: new Date().toISOString(),
      jobId: 'previous-job',
    });

    mockedRunDockerCompose
      .mockResolvedValueOnce({ stdout: 'pull ok', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: '', stderr: 'up failed', exitCode: 1 })
      .mockResolvedValueOnce({ stdout: 'rollback pull ok', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'rollback up ok', stderr: '', exitCode: 0 });
    mockedWaitForHealthcheck.mockResolvedValue();

    const result = await runDeployEngine(createJob(fixture, 'sha-new1234'));

    expect(result.status).toBe('rolled_back');
    expect(result.rollbackTag).toBe('sha-old123');
    expect(readFileSync(fixture.runtimeEnvFilePath, 'utf8')).toContain('IMAGE_TAG=sha-old123');

    fixture.cleanup();
  });

  it('fails without rollback if there is no previous successful tag', async () => {
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

    mockedRunDockerCompose
      .mockResolvedValueOnce({ stdout: 'pull ok', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: '', stderr: 'up failed', exitCode: 1 });

    const result = await runDeployEngine(createJob(fixture, 'sha-fail123'));

    expect(result.status).toBe('failed');
    expect(result.rollbackTag).toBeUndefined();

    fixture.cleanup();
  });
});
