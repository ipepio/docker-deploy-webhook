import { generateCaddyfile, type CaddyfileContext } from './caddyfile';
import { type RepoYaml } from '../config/schema';

function makeRepo(overrides: Partial<RepoYaml['environments'][string]['proxy']> = {}): RepoYaml {
  return {
    repository: 'acme/app',
    webhook: { bearer_token_env: 'BEARER', hmac_secret_env: 'HMAC' },
    environments: {
      production: {
        image_name: 'ghcr.io/acme/app',
        compose_file: '/opt/stacks/acme/app/docker-compose.yml',
        runtime_env_file: '/opt/stacks/acme/app/.deploy.env',
        services: ['app'],
        allowed_workflows: ['Release'],
        allowed_branches: ['main'],
        allowed_tag_pattern: '^v[0-9]+',
        proxy: {
          enabled: true,
          container_port: 3000,
          ssl: 'off',
          upstream: 'app-app-1:3000',
          ...overrides,
        },
      },
    },
  };
}

const ctx = (repos: RepoYaml[], extras: Partial<CaddyfileContext> = {}): CaddyfileContext => ({
  repos,
  fallbackIp: '203.0.113.5',
  acmeEmail: undefined,
  ...extras,
});

describe('generateCaddyfile', () => {
  it('returns empty global block only when no repos', () => {
    const output = generateCaddyfile(ctx([]));
    expect(output).toBe('');
  });

  it('generates domain + ssl:auto block (no scheme prefix)', () => {
    const repo = makeRepo({ domain: 'app.example.com', ssl: 'auto' });
    const output = generateCaddyfile(ctx([repo], { acmeEmail: 'admin@example.com' }));
    expect(output).toContain('app.example.com {');
    expect(output).toContain('reverse_proxy app-app-1:3000');
    expect(output).not.toContain('tls internal');
    expect(output).toContain('email admin@example.com');
  });

  it('generates domain + ssl:self-signed with tls internal', () => {
    const repo = makeRepo({ domain: 'app.example.com', ssl: 'self-signed' });
    const output = generateCaddyfile(ctx([repo]));
    expect(output).toContain('https://app.example.com {');
    expect(output).toContain('tls internal');
    expect(output).toContain('reverse_proxy app-app-1:3000');
  });

  it('generates domain + ssl:off with http:// prefix', () => {
    const repo = makeRepo({ domain: 'app.example.com', ssl: 'off' });
    const output = generateCaddyfile(ctx([repo]));
    expect(output).toContain('http://app.example.com {');
    expect(output).not.toContain('tls internal');
  });

  it('generates IP-based route with assigned_port and ssl:off', () => {
    const repo = makeRepo({ ssl: 'off', assigned_port: 8100 });
    const output = generateCaddyfile(ctx([repo]));
    expect(output).toContain('http://203.0.113.5:8100 {');
    expect(output).toContain('reverse_proxy app-app-1:3000');
  });

  it('generates IP-based route with ssl:self-signed', () => {
    const repo = makeRepo({ ssl: 'self-signed', assigned_port: 8100 });
    const output = generateCaddyfile(ctx([repo]));
    expect(output).toContain('https://203.0.113.5:8100 {');
    expect(output).toContain('tls internal');
  });

  it('excludes routes with proxy.enabled = false', () => {
    const repo = makeRepo({ enabled: false, domain: 'app.example.com' });
    const output = generateCaddyfile(ctx([repo]));
    expect(output).not.toContain('app.example.com');
  });

  it('excludes routes with no upstream', () => {
    const repo = makeRepo({ upstream: undefined, domain: 'app.example.com' });
    const output = generateCaddyfile(ctx([repo]));
    expect(output).not.toContain('app.example.com');
  });

  it('adds global email block when ssl:auto is used', () => {
    const repo = makeRepo({ domain: 'x.com', ssl: 'auto' });
    const output = generateCaddyfile(ctx([repo], { acmeEmail: 'me@example.com' }));
    expect(output).toMatch(/^\{/);
    expect(output).toContain('email me@example.com');
  });

  it('omits global block when no ssl:auto and no email', () => {
    const repo = makeRepo({ domain: 'x.com', ssl: 'off' });
    const output = generateCaddyfile(ctx([repo]));
    expect(output).not.toMatch(/^\{/);
  });

  it('sorts multiple routes deterministically', () => {
    const a = makeRepo({ domain: 'z.example.com', ssl: 'off' });
    const b: RepoYaml = {
      ...a,
      repository: 'acme/b',
      environments: {
        production: {
          ...a.environments.production,
          proxy: {
            enabled: true,
            container_port: 3000,
            ssl: 'off',
            upstream: 'b:3000',
            domain: 'a.example.com',
          },
        },
      },
    };

    const out1 = generateCaddyfile(ctx([a, b]));
    const out2 = generateCaddyfile(ctx([b, a]));
    expect(out1).toBe(out2);
    expect(out1.indexOf('a.example.com')).toBeLessThan(out1.indexOf('z.example.com'));
  });
});
