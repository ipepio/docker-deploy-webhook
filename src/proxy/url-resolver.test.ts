import { resolveProxyUrl, deriveUpstream } from './url-resolver';
import { type EnvironmentProxyConfig } from '../config/schema';
import { ConfigError } from '../config/errors';

function makeProxy(overrides: Partial<EnvironmentProxyConfig> = {}): EnvironmentProxyConfig {
  return {
    enabled: true,
    containerPort: 3000,
    ssl: 'off',
    ...overrides,
  };
}

describe('resolveProxyUrl', () => {
  it('domain + ssl:auto → https://domain', () => {
    const url = resolveProxyUrl(makeProxy({ domain: 'app.example.com', ssl: 'auto' }), null);
    expect(url).toBe('https://app.example.com');
  });

  it('domain + ssl:self-signed → https://domain', () => {
    const url = resolveProxyUrl(makeProxy({ domain: 'app.example.com', ssl: 'self-signed' }), null);
    expect(url).toBe('https://app.example.com');
  });

  it('domain + ssl:off → http://domain', () => {
    const url = resolveProxyUrl(makeProxy({ domain: 'app.example.com', ssl: 'off' }), null);
    expect(url).toBe('http://app.example.com');
  });

  it('IP + ssl:off → http://ip:port', () => {
    const url = resolveProxyUrl(makeProxy({ ssl: 'off', assignedPort: 8100 }), '203.0.113.5');
    expect(url).toBe('http://203.0.113.5:8100');
  });

  it('IP + ssl:self-signed → https://ip:port', () => {
    const url = resolveProxyUrl(
      makeProxy({ ssl: 'self-signed', assignedPort: 8100 }),
      '203.0.113.5',
    );
    expect(url).toBe('https://203.0.113.5:8100');
  });

  it('IP + ssl:auto → throws ConfigError', () => {
    expect(() =>
      resolveProxyUrl(makeProxy({ ssl: 'auto', assignedPort: 8100 }), '203.0.113.5'),
    ).toThrow(ConfigError);
  });

  it('IP without assigned_port → throws ConfigError', () => {
    expect(() => resolveProxyUrl(makeProxy({ ssl: 'off' }), '203.0.113.5')).toThrow(ConfigError);
  });

  it('uses fallback 0.0.0.0 when no ip provided', () => {
    const url = resolveProxyUrl(makeProxy({ ssl: 'off', assignedPort: 8100 }), null);
    expect(url).toBe('http://0.0.0.0:8100');
  });
});

describe('deriveUpstream', () => {
  it('derives container name from compose file path', () => {
    const upstream = deriveUpstream(
      '/opt/stacks/acme/payments-api/docker-compose.yml',
      'app',
      3000,
    );
    expect(upstream).toBe('payments-api-app-1:3000');
  });

  it('handles simple directory names', () => {
    const upstream = deriveUpstream('/opt/stacks/api/docker-compose.yml', 'web', 8080);
    expect(upstream).toBe('api-web-1:8080');
  });

  it('sanitizes special characters in directory name', () => {
    const upstream = deriveUpstream('/opt/stacks/my_app/docker-compose.yml', 'app', 3000);
    expect(upstream).toBe('my-app-app-1:3000');
  });
});
