import { existsSync, readFileSync, writeFileSync } from 'fs';

import yaml from 'js-yaml';

import { type ProxySslMode, ServerYamlSchema } from '../config/schema';
import { ConfigError } from '../config/errors';
import { findRepoFile, listRepoFiles, writeRepoFile } from '../config/repo-files';
import { resolveConfigPaths } from '../config/paths';
import { deriveUpstream } from './url-resolver';

const FIRST_ASSIGNED_PORT = 8100;

// ── Server proxy config ───────────────────────────────────────────────────────

function readServerYamlRaw(path: string): Record<string, unknown> {
  return yaml.load(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

function writeServerYamlRaw(path: string, raw: Record<string, unknown>): void {
  writeFileSync(path, yaml.dump(raw, { lineWidth: 120 }), 'utf8');
}

export interface ServerProxySettings {
  portsAuthorized?: boolean;
  fallbackIp?: string;
  acmeEmail?: string;
  nextPort?: number;
  enabled?: boolean;
}

export function readServerProxySettings(): {
  portsAuthorized: boolean;
  fallbackIp?: string;
  acmeEmail?: string;
  nextPort: number;
  enabled: boolean;
} {
  const { serverConfigPath } = resolveConfigPaths();
  if (!existsSync(serverConfigPath)) {
    return { portsAuthorized: false, nextPort: FIRST_ASSIGNED_PORT, enabled: false };
  }

  const raw = readServerYamlRaw(serverConfigPath);
  const parsed = ServerYamlSchema.parse(raw);
  const p = parsed.server.proxy;

  return {
    portsAuthorized: p.ports_authorized,
    fallbackIp: p.fallback_ip,
    acmeEmail: p.acme_email,
    nextPort: p.next_port,
    enabled: p.enabled,
  };
}

export function updateServerProxySettings(settings: ServerProxySettings): void {
  const { serverConfigPath } = resolveConfigPaths();
  const raw = readServerYamlRaw(serverConfigPath);
  const server = (raw.server ?? {}) as Record<string, unknown>;
  const proxy = (server.proxy ?? {}) as Record<string, unknown>;

  if (settings.portsAuthorized !== undefined) proxy.ports_authorized = settings.portsAuthorized;
  if (settings.fallbackIp !== undefined) proxy.fallback_ip = settings.fallbackIp;
  if (settings.acmeEmail !== undefined) proxy.acme_email = settings.acmeEmail;
  if (settings.nextPort !== undefined) proxy.next_port = settings.nextPort;
  if (settings.enabled !== undefined) proxy.enabled = settings.enabled;

  server.proxy = proxy;
  raw.server = server;
  writeServerYamlRaw(serverConfigPath, raw);
}

// ── Per-repo proxy config ─────────────────────────────────────────────────────

export interface RepoProxyInput {
  repository: string;
  environment: string;
  domain?: string;
  containerPort?: number;
  ssl?: ProxySslMode;
  enabled?: boolean;
}

export function allocatePort(): number {
  const settings = readServerProxySettings();
  const port = settings.nextPort;
  updateServerProxySettings({ nextPort: port + 1 });
  return port;
}

export function getUsedPorts(): number[] {
  const files = listRepoFiles();
  const ports: number[] = [];
  for (const file of files) {
    for (const env of Object.values(file.repoYaml.environments)) {
      if (env.proxy?.assigned_port) {
        ports.push(env.proxy.assigned_port);
      }
    }
  }
  return ports;
}

function nextAvailablePort(startPort: number): number {
  const used = new Set(getUsedPorts());
  let port = startPort;
  while (used.has(port)) {
    port += 1;
  }
  return port;
}

export function enableRepoProxy(input: RepoProxyInput): void {
  const file = findRepoFile(input.repository);
  if (!file) {
    throw new ConfigError(`Repository not found: ${input.repository}`);
  }

  const repoYaml = file.repoYaml;
  const envConfig = repoYaml.environments[input.environment];
  if (!envConfig) {
    throw new ConfigError(`Environment not found: ${input.repository} ${input.environment}`);
  }

  const ssl = input.ssl ?? envConfig.proxy?.ssl ?? 'off';

  if (ssl === 'auto' && !input.domain && !envConfig.proxy?.domain) {
    throw new ConfigError('ssl: auto requires a domain');
  }

  const settings = readServerProxySettings();
  const existingPort = envConfig.proxy?.assigned_port;
  const assignedPort = existingPort ?? nextAvailablePort(settings.nextPort);

  if (!existingPort) {
    updateServerProxySettings({ nextPort: Math.max(settings.nextPort, assignedPort + 1) });
  }

  const domain = input.domain ?? envConfig.proxy?.domain;
  const containerPort = input.containerPort ?? envConfig.proxy?.container_port ?? 3000;
  const firstService = envConfig.services[0] ?? 'app';
  const upstream = deriveUpstream(envConfig.compose_file, firstService, containerPort);

  const updatedYaml: typeof repoYaml = {
    ...repoYaml,
    environments: {
      ...repoYaml.environments,
      [input.environment]: {
        ...envConfig,
        proxy: {
          enabled: true,
          domain,
          container_port: containerPort,
          ssl,
          assigned_port: assignedPort,
          upstream,
        },
      },
    },
  };

  writeRepoFile(input.repository, updatedYaml);
}

export function disableRepoProxy(repository: string, environment: string): void {
  const file = findRepoFile(repository);
  if (!file) throw new ConfigError(`Repository not found: ${repository}`);

  const repoYaml = file.repoYaml;
  const envConfig = repoYaml.environments[environment];
  if (!envConfig) throw new ConfigError(`Environment not found: ${repository} ${environment}`);

  const updatedYaml: typeof repoYaml = {
    ...repoYaml,
    environments: {
      ...repoYaml.environments,
      [environment]: {
        ...envConfig,
        proxy: {
          enabled: false,
          container_port: envConfig.proxy?.container_port ?? 3000,
          ssl: envConfig.proxy?.ssl ?? 'off',
          domain: envConfig.proxy?.domain,
          assigned_port: envConfig.proxy?.assigned_port,
          upstream: envConfig.proxy?.upstream,
        },
      },
    },
  };

  writeRepoFile(repository, updatedYaml);
}

export function setRepoProxySsl(repository: string, environment: string, ssl: ProxySslMode): void {
  const file = findRepoFile(repository);
  if (!file) throw new ConfigError(`Repository not found: ${repository}`);

  const repoYaml = file.repoYaml;
  const envConfig = repoYaml.environments[environment];
  if (!envConfig) throw new ConfigError(`Environment not found: ${repository} ${environment}`);

  const domain = envConfig.proxy?.domain;
  if (ssl === 'auto' && !domain) {
    throw new ConfigError(
      'ssl: auto requires a domain. Add one with: depctl proxy enable --domain',
    );
  }

  const updatedYaml: typeof repoYaml = {
    ...repoYaml,
    environments: {
      ...repoYaml.environments,
      [environment]: {
        ...envConfig,
        proxy: {
          enabled: envConfig.proxy?.enabled ?? false,
          container_port: envConfig.proxy?.container_port ?? 3000,
          ssl,
          domain: envConfig.proxy?.domain,
          assigned_port: envConfig.proxy?.assigned_port,
          upstream: envConfig.proxy?.upstream,
        },
      },
    },
  };

  writeRepoFile(repository, updatedYaml);
}

export interface ProxyRouteInfo {
  repository: string;
  environment: string;
  domain?: string;
  ssl: string;
  assignedPort?: number;
  enabled: boolean;
  upstream?: string;
}

export function listProxyRoutes(): ProxyRouteInfo[] {
  const files = listRepoFiles();
  const routes: ProxyRouteInfo[] = [];

  for (const file of files) {
    for (const [envName, envConfig] of Object.entries(file.repoYaml.environments)) {
      if (!envConfig.proxy) continue;
      routes.push({
        repository: file.repoYaml.repository,
        environment: envName,
        domain: envConfig.proxy.domain,
        ssl: envConfig.proxy.ssl ?? 'off',
        assignedPort: envConfig.proxy.assigned_port,
        enabled: envConfig.proxy.enabled ?? false,
        upstream: envConfig.proxy.upstream,
      });
    }
  }

  return routes;
}
