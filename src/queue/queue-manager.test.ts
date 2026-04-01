import { initConfig, resetConfig } from '../config';
import { createTempConfigFixture } from '../test-utils/temp-config';

const redisStore = new Map<string, string>();
const redisLists = new Map<string, string[]>();
const queueJobs = new Map<string, { removed: boolean }>();

jest.mock('./redis', () => ({
  getRedisClient: () => ({
    async get(key: string) {
      return redisStore.get(key) ?? null;
    },
    async set(key: string, value: string) {
      redisStore.set(key, value);
      return 'OK';
    },
    async del(key: string) {
      redisStore.delete(key);
      return 1;
    },
    async lrange(key: string, start: number, end: number) {
      return (redisLists.get(key) ?? []).slice(start, end + 1);
    },
    async lpush(key: string, value: string) {
      const current = redisLists.get(key) ?? [];
      current.unshift(value);
      redisLists.set(key, current);
      return current.length;
    },
    async ltrim(key: string, start: number, end: number) {
      const current = redisLists.get(key) ?? [];
      redisLists.set(key, current.slice(start, end + 1));
      return 'OK';
    },
    async expire() {
      return 1;
    },
    multi() {
      return {
        lpush(key: string, value: string) {
          const current = redisLists.get(key) ?? [];
          current.unshift(value);
          redisLists.set(key, current);
          return this;
        },
        ltrim(key: string, start: number, end: number) {
          const current = redisLists.get(key) ?? [];
          redisLists.set(key, current.slice(start, end + 1));
          return this;
        },
        expire() {
          return this;
        },
        async exec() {
          return [];
        },
      };
    },
  }),
}));

jest.mock('./queue', () => ({
  getDeployQueue: () => ({
    async add(_name: string, _payload: unknown, options: { jobId: string }) {
      queueJobs.set(options.jobId, { removed: false });
      return { id: options.jobId };
    },
    async getJob(jobId: string) {
      if (!queueJobs.has(jobId)) {
        return null;
      }
      return {
        async remove() {
          queueJobs.set(jobId, { removed: true });
        },
      };
    },
  }),
}));

import { enqueueDeployJob, getJob } from './queue-manager';

describe('queue manager deduplication', () => {
  beforeEach(() => {
    redisStore.clear();
    redisLists.clear();
    queueJobs.clear();
  });

  afterEach(() => {
    resetConfig();
    delete process.env.TEST_ADMIN_READ_TOKEN;
    delete process.env.TEST_ADMIN_WRITE_TOKEN;
    delete process.env.TEST_REPO_BEARER;
    delete process.env.TEST_REPO_HMAC;
    delete process.env.STATE_DIR;
  });

  it('ignores a duplicate pending deployment with the same tag', async () => {
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
      refName: 'main',
      runId: 1,
      triggeredBy: 'webhook' as const,
      force: false,
    };

    const first = await enqueueDeployJob(payload);
    const second = await enqueueDeployJob(payload);

    expect(first.status).toBe('enqueued');
    expect(second.status).toBe('ignored_duplicate');
    expect(second.jobId).toBe(first.jobId);

    fixture.cleanup();
  });

  it('replaces the previous pending deployment for the same repo and environment', async () => {
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

    const first = await enqueueDeployJob({
      repository: fixture.repository,
      environment: fixture.environment,
      tag: 'sha-old1234',
      sha: 'old1234',
      workflow: 'deploy-production',
      refName: 'main',
      runId: 1,
      triggeredBy: 'webhook',
      force: false,
    });

    const second = await enqueueDeployJob({
      repository: fixture.repository,
      environment: fixture.environment,
      tag: 'sha-new1234',
      sha: 'new1234',
      workflow: 'deploy-production',
      refName: 'main',
      runId: 2,
      triggeredBy: 'webhook',
      force: false,
    });

    const cancelledJob = await getJob(first.jobId);

    expect(second.status).toBe('replaced_pending');
    expect(cancelledJob?.status).toBe('cancelled');

    fixture.cleanup();
  });
});
