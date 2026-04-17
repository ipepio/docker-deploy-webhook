# Atomic 16.1

## Objective
Caddyfile template engine — build full Caddyfile from repo configs.

## Details
- `src/proxy/caddyfile.ts` module.
- `generateCaddyfile(repos: RepoConfig[], serverConfig: ServerConfig): string`
- Iterates all repos → environments. For each with `proxy.domain` or fallback IP:
  - Generate server block: `domain:port { reverse_proxy container:app_port }`
  - Container name derived from compose service name.
  - App port from new `proxy.container_port` field in repo config (default 3000).
- Global block at top: email for ACME (if SSL auto), log config.
- Output is deterministic (sorted by domain) for diffability.

## Acceptance criteria
- [ ] Generates valid Caddyfile syntax from repo configs.
- [ ] One server block per repo/environment with proxy enabled.
- [ ] Deterministic output (same input → same output).
- [ ] Handles zero repos gracefully (empty Caddyfile with global block only).
