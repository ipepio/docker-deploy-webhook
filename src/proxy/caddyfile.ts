import { type RepoYaml } from '../config/schema';

export interface CaddyfileContext {
  repos: RepoYaml[];
  fallbackIp: string | null | undefined;
  acmeEmail: string | null | undefined;
}

interface RouteBlock {
  address: string;
  directives: string[];
}

function buildRouteBlock(
  proxy: NonNullable<RepoYaml['environments'][string]['proxy']>,
  fallbackIp: string | null | undefined,
): RouteBlock | null {
  if (!proxy.enabled) return null;

  const upstream = proxy.upstream;
  if (!upstream) return null;

  const ssl = proxy.ssl ?? 'off';

  if (ssl === 'auto' && !proxy.domain) return null;

  let address: string;

  if (proxy.domain) {
    if (ssl === 'off') {
      address = `http://${proxy.domain}`;
    } else if (ssl === 'self-signed') {
      address = `https://${proxy.domain}`;
    } else {
      // auto — Caddy handles HTTPS automatically for plain hostname
      address = proxy.domain;
    }
  } else {
    const ip = fallbackIp ?? '0.0.0.0';
    const port = proxy.assigned_port;
    if (!port) return null;
    address = ssl === 'off' ? `http://${ip}:${port}` : `https://${ip}:${port}`;
  }

  const directives: string[] = [];

  if (ssl === 'self-signed') {
    directives.push('tls internal');
  }

  directives.push(`reverse_proxy ${upstream}`);

  return { address, directives };
}

export function generateCaddyfile(context: CaddyfileContext): string {
  const lines: string[] = [];

  // Global block
  const hasAutoRoutes = context.repos.some((repo) =>
    Object.values(repo.environments).some((env) => env.proxy?.ssl === 'auto'),
  );

  if (hasAutoRoutes || context.acmeEmail) {
    lines.push('{');
    if (context.acmeEmail) {
      lines.push(`\temail ${context.acmeEmail}`);
    }
    lines.push('}');
    lines.push('');
  }

  // Collect and sort all route blocks for deterministic output
  const blocks: RouteBlock[] = [];

  for (const repo of context.repos) {
    for (const env of Object.values(repo.environments)) {
      if (!env.proxy) continue;
      const block = buildRouteBlock(env.proxy, context.fallbackIp);
      if (block) blocks.push(block);
    }
  }

  blocks.sort((a, b) => a.address.localeCompare(b.address));

  for (const block of blocks) {
    lines.push(`${block.address} {`);
    for (const directive of block.directives) {
      lines.push(`\t${directive}`);
    }
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}
