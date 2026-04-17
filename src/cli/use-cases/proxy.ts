import { type ProxySslMode } from '../../config/schema';
import { ConfigError } from '../../config/errors';
import { startCaddy, isCaddyRunning, ensureProxyNetwork } from '../../proxy/caddy';
import { checkRequiredPorts, getUnavailablePorts } from '../../proxy/ports';
import { detectMachineIps } from '../../proxy/ip-detect';
import { resolveProxyUrl } from '../../proxy/url-resolver';
import { rebuildAndReload } from '../../proxy/caddyfile-writer';
import {
  readServerProxySettings,
  updateServerProxySettings,
  enableRepoProxy,
  disableRepoProxy,
  setRepoProxySsl,
  listProxyRoutes,
} from '../../proxy/proxy-config';
import { confirm, resolveOptionalString } from '../io';
import { findRepoFile } from '../../config/repo-files';

// ── proxy init ────────────────────────────────────────────────────────────────

export interface ProxyInitOptions {
  acmeEmail?: string;
  nonInteractive?: boolean;
}

export interface ProxyInitResult {
  initialized: boolean;
  fallbackIp: string | null;
  acmeEmail?: string;
  ports: number[];
}

export async function runProxyInit(options: ProxyInitOptions = {}): Promise<ProxyInitResult> {
  const settings = readServerProxySettings();

  if (settings.portsAuthorized) {
    const running = await isCaddyRunning();
    if (running) {
      return {
        initialized: true,
        fallbackIp: settings.fallbackIp ?? null,
        acmeEmail: settings.acmeEmail,
        ports: [80, 443],
      };
    }
  }

  // Port availability check
  const portResults = await checkRequiredPorts();
  const unavailable = getUnavailablePorts(portResults);
  if (unavailable.length > 0) {
    throw new ConfigError(
      `Ports ${unavailable.join(', ')} are already in use. Free them before initializing the proxy.`,
    );
  }

  // Permission prompt
  if (!settings.portsAuthorized) {
    if (options.nonInteractive) {
      throw new ConfigError(
        'Proxy not initialized. Run `depctl proxy init` interactively to authorize ports 80/443.',
      );
    }

    const ok = await confirm('Caddy needs to bind ports 80 and 443 on this machine. Allow?', false);
    if (!ok) {
      throw new ConfigError('Port authorization denied. Proxy not initialized.');
    }
  }

  // Detect IPs
  const ips = await detectMachineIps();
  const fallbackIp = ips.public ?? ips.private;

  // Optional ACME email
  const acmeEmail =
    options.acmeEmail ??
    (await resolveOptionalString(
      undefined,
      "Email for Let's Encrypt certificates (leave empty to skip)",
    ));

  // Persist settings
  updateServerProxySettings({
    enabled: true,
    portsAuthorized: true,
    fallbackIp: fallbackIp ?? undefined,
    acmeEmail: acmeEmail ?? undefined,
  });

  // Ensure shared Docker network exists
  await ensureProxyNetwork();

  // Write initial Caddyfile
  await rebuildAndReload({ fallbackIp, acmeEmail: acmeEmail ?? undefined });

  // Start Caddy
  await startCaddy();

  return {
    initialized: true,
    fallbackIp,
    acmeEmail: acmeEmail ?? undefined,
    ports: [80, 443],
  };
}

// ── proxy status ──────────────────────────────────────────────────────────────

export interface ProxyStatusResult {
  running: boolean;
  ports: number[];
  publicIp: string | null;
  privateIp: string | null;
  routes: number;
  sslBreakdown: { auto: number; selfSigned: number; off: number };
}

export async function runProxyStatus(): Promise<ProxyStatusResult> {
  const settings = readServerProxySettings();
  const routes = listProxyRoutes();
  const enabledRoutes = routes.filter((r) => r.enabled);

  const sslBreakdown = {
    auto: enabledRoutes.filter((r) => r.ssl === 'auto').length,
    selfSigned: enabledRoutes.filter((r) => r.ssl === 'self-signed').length,
    off: enabledRoutes.filter((r) => r.ssl === 'off').length,
  };

  let publicIp: string | null = null;
  let privateIp: string | null = null;

  if (settings.portsAuthorized) {
    const ips = await detectMachineIps();
    publicIp = settings.fallbackIp ?? ips.public;
    privateIp = ips.private;
  }

  const running = settings.portsAuthorized ? await isCaddyRunning() : false;

  return {
    running,
    ports: [80, 443],
    publicIp,
    privateIp,
    routes: enabledRoutes.length,
    sslBreakdown,
  };
}

export function formatProxyStatus(status: ProxyStatusResult): string {
  const tick = status.running ? 'running' : 'stopped';
  const lines: string[] = [''];
  lines.push(`  Proxy:    ${tick}`);
  lines.push(`  Ports:    80, 443`);
  lines.push(
    `  IP:       ${status.publicIp ?? '(unknown)'} (public) / ${status.privateIp ?? '(unknown)'} (private)`,
  );
  lines.push(`  Routes:   ${status.routes} active`);
  lines.push(
    `  SSL:      ${status.sslBreakdown.auto} auto, ${status.sslBreakdown.selfSigned} self-signed, ${status.sslBreakdown.off} off`,
  );
  lines.push('');
  return lines.join('\n');
}

// ── proxy domains ─────────────────────────────────────────────────────────────

export interface DomainRow {
  repo: string;
  env: string;
  domain: string;
  ssl: string;
  url: string;
}

export async function runProxyDomains(): Promise<DomainRow[]> {
  const settings = readServerProxySettings();
  const routes = listProxyRoutes();

  return routes
    .filter((r) => r.enabled)
    .map((r) => {
      let url = '(not configured)';
      try {
        url = resolveProxyUrl(
          {
            enabled: r.enabled,
            domain: r.domain,
            containerPort: 3000,
            ssl: r.ssl as ProxySslMode,
            assignedPort: r.assignedPort,
          },
          settings.fallbackIp,
        );
      } catch {
        url = '(error)';
      }

      return {
        repo: r.repository,
        env: r.environment,
        domain: r.domain ?? '—',
        ssl: r.ssl,
        url,
      };
    });
}

export function formatProxyDomains(rows: DomainRow[]): string {
  if (rows.length === 0) {
    return '\n  No proxy routes configured. Run: depctl proxy enable <owner/repo>\n\n';
  }

  const COL = [22, 12, 28, 12, 40];
  const header = [
    'REPO'.padEnd(COL[0]),
    'ENV'.padEnd(COL[1]),
    'DOMAIN'.padEnd(COL[2]),
    'SSL'.padEnd(COL[3]),
    'URL',
  ].join('  ');

  const sep = COL.map((w) => '-'.repeat(w)).join('  ');
  const lines = ['', `  ${header}`, `  ${sep}`];

  for (const row of rows) {
    lines.push(
      '  ' +
        [
          row.repo.slice(0, COL[0] - 1).padEnd(COL[0]),
          row.env.slice(0, COL[1] - 1).padEnd(COL[1]),
          row.domain.slice(0, COL[2] - 1).padEnd(COL[2]),
          row.ssl.slice(0, COL[3] - 1).padEnd(COL[3]),
          row.url,
        ].join('  '),
    );
  }

  lines.push('');
  return lines.join('\n');
}

// ── proxy enable ──────────────────────────────────────────────────────────────

export interface ProxyEnableOptions {
  repository: string;
  environment: string;
  domain?: string;
  containerPort?: number;
  ssl?: ProxySslMode;
}

export interface ProxyEnableResult {
  repository: string;
  environment: string;
  url: string;
  note: string;
}

export async function runProxyEnable(options: ProxyEnableOptions): Promise<ProxyEnableResult> {
  const settings = readServerProxySettings();

  const file = findRepoFile(options.repository);
  if (!file) throw new ConfigError(`Repository not found: ${options.repository}`);

  const envConfig = file.repoYaml.environments[options.environment];
  if (!envConfig) {
    throw new ConfigError(`Environment not found: ${options.repository} ${options.environment}`);
  }

  let domain = options.domain ?? envConfig.proxy?.domain;
  let containerPort = options.containerPort ?? envConfig.proxy?.container_port ?? 3000;

  if (!domain && !options.domain && process.stdin.isTTY) {
    domain = await resolveOptionalString(undefined, 'Domain (leave empty for IP-based routing)');
  }

  if (!containerPort && process.stdin.isTTY) {
    const portStr = await resolveOptionalString(undefined, 'App port inside container', '3000');
    containerPort = parseInt(portStr ?? '3000', 10);
  }

  enableRepoProxy({
    repository: options.repository,
    environment: options.environment,
    domain: domain || undefined,
    containerPort,
    ssl: options.ssl,
  });

  // Reload Caddyfile if proxy is initialized
  if (settings.portsAuthorized) {
    await rebuildAndReload({ fallbackIp: settings.fallbackIp, acmeEmail: settings.acmeEmail });
  }

  const updated = findRepoFile(options.repository)!.repoYaml.environments[options.environment];
  let url = '(proxy not initialized — run: depctl proxy init)';

  if (settings.portsAuthorized && updated.proxy) {
    try {
      url = resolveProxyUrl(
        {
          enabled: true,
          domain: updated.proxy.domain,
          containerPort: updated.proxy.container_port ?? 3000,
          ssl: updated.proxy.ssl ?? 'off',
          assignedPort: updated.proxy.assigned_port,
        },
        settings.fallbackIp,
      );
    } catch {
      url = '(error resolving URL)';
    }
  }

  return {
    repository: options.repository,
    environment: options.environment,
    url,
    note: `Add "${updated.proxy?.upstream}" to the depctl-proxy Docker network in your stack.`,
  };
}

// ── proxy disable ─────────────────────────────────────────────────────────────

export async function runProxyDisable(
  repository: string,
  environment: string,
): Promise<{ repository: string; environment: string }> {
  disableRepoProxy(repository, environment);

  const settings = readServerProxySettings();
  if (settings.portsAuthorized) {
    await rebuildAndReload({ fallbackIp: settings.fallbackIp, acmeEmail: settings.acmeEmail });
  }

  return { repository, environment };
}

// ── proxy ssl ─────────────────────────────────────────────────────────────────

export interface ProxySslResult {
  repository: string;
  environment: string;
  ssl: ProxySslMode;
  url: string;
}

export async function runProxySsl(
  repository: string,
  environment: string,
  mode: ProxySslMode,
): Promise<ProxySslResult> {
  setRepoProxySsl(repository, environment, mode);

  const settings = readServerProxySettings();
  if (settings.portsAuthorized) {
    await rebuildAndReload({ fallbackIp: settings.fallbackIp, acmeEmail: settings.acmeEmail });
  }

  const envConfig = findRepoFile(repository)!.repoYaml.environments[environment];
  let url = '(proxy not initialized)';

  if (settings.portsAuthorized && envConfig.proxy) {
    try {
      url = resolveProxyUrl(
        {
          enabled: true,
          domain: envConfig.proxy.domain,
          containerPort: envConfig.proxy.container_port ?? 3000,
          ssl: mode,
          assignedPort: envConfig.proxy.assigned_port,
        },
        settings.fallbackIp,
      );
    } catch {
      url = '(error resolving URL)';
    }
  }

  return { repository, environment, ssl: mode, url };
}
