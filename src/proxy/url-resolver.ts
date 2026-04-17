import { type EnvironmentProxyConfig, type ProxySslMode } from '../config/schema';
import { ConfigError } from '../config/errors';

function schemeFor(ssl: ProxySslMode): string {
  return ssl === 'off' ? 'http' : 'https';
}

export function resolveProxyUrl(
  proxy: EnvironmentProxyConfig,
  fallbackIp: string | null | undefined,
): string {
  if (proxy.ssl === 'auto' && !proxy.domain) {
    throw new ConfigError(
      'ssl: auto requires a domain. IP-only routes can use off or self-signed.',
    );
  }

  const scheme = schemeFor(proxy.ssl);

  if (proxy.domain) {
    return `${scheme}://${proxy.domain}`;
  }

  const ip = fallbackIp ?? '0.0.0.0';

  if (!proxy.assignedPort) {
    throw new ConfigError('No assigned_port for IP-based proxy route. Run: depctl proxy enable');
  }

  return `${scheme}://${ip}:${proxy.assignedPort}`;
}

export function deriveUpstream(
  composeFile: string,
  service: string,
  containerPort: number,
): string {
  const parts = composeFile.split('/').filter(Boolean);
  const stackDir = parts.at(-2) ?? parts.at(-1) ?? 'app';
  const projectName = stackDir.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const containerName = `${projectName}-${service}-1`;
  return `${containerName}:${containerPort}`;
}
