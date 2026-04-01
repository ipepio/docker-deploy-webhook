import { ConfigError } from './errors';
import { loadConfig } from './loader';
import { createTempConfigFixture } from '../test-utils/temp-config';

describe('loadConfig', () => {
  afterEach(() => {
    delete process.env.TEST_ADMIN_READ_TOKEN;
    delete process.env.TEST_ADMIN_WRITE_TOKEN;
    delete process.env.TEST_REPO_BEARER;
    delete process.env.TEST_REPO_HMAC;
    delete process.env.STATE_DIR;
  });

  it('loads a valid server and repo configuration', async () => {
    const fixture = createTempConfigFixture();
    process.env.TEST_ADMIN_READ_TOKEN = 'read-token';
    process.env.TEST_ADMIN_WRITE_TOKEN = 'write-token';
    process.env.TEST_REPO_BEARER = 'repo-bearer';
    process.env.TEST_REPO_HMAC = 'repo-hmac';
    process.env.STATE_DIR = `${fixture.rootDir}/state`;

    const config = await loadConfig({
      serverConfigPath: fixture.serverConfigPath,
      reposConfigPath: fixture.reposConfigPath,
    });

    expect(config.server.id).toBe('test-server');
    expect(config.server.security.adminReadToken).toBe('read-token');
    expect(config.repos.get(fixture.repository)?.webhook.bearerToken).toBe('repo-bearer');
    expect(config.repos.get(fixture.repository)?.environments.production.imageName).toBe(
      fixture.imageName,
    );

    fixture.cleanup();
  });

  it('fails if a required secret is missing', async () => {
    const fixture = createTempConfigFixture();
    process.env.TEST_ADMIN_READ_TOKEN = 'read-token';
    process.env.TEST_ADMIN_WRITE_TOKEN = 'write-token';
    process.env.TEST_REPO_BEARER = 'repo-bearer';
    delete process.env.TEST_REPO_HMAC;
    process.env.STATE_DIR = `${fixture.rootDir}/state`;

    await expect(
      loadConfig({
        serverConfigPath: fixture.serverConfigPath,
        reposConfigPath: fixture.reposConfigPath,
      }),
    ).rejects.toBeInstanceOf(ConfigError);

    fixture.cleanup();
  });
});
