# Atomic 17.3

## Objective
URL generation strategy and integration with `depctl repo add` wizard.

## Details
- `src/proxy/url-resolver.ts` module.
- `resolveProxyUrl(env: EnvironmentConfig, serverConfig: ServerConfig): string`
  - If `proxy.domain` set → `https://domain` or `http://domain` depending on SSL mode.
  - If no domain → `http://<fallback_ip>:<auto_port>` (Caddy listens on IP with port-based routing).
  - For IP fallback: each repo/env gets a unique port mapped through Caddy. Port range starts at 8100, assigned sequentially, stored in repo config as `proxy.assigned_port`.
- Integrate into `depctl repo add` wizard:
  - New step: "Configure reverse proxy? [y/N]"
  - If yes: "Domain (leave empty for IP-based): "
  - "App port inside container [3000]: "
  - Show generated URL at the end.

## Acceptance criteria
- [ ] Domain-based URLs use the domain directly.
- [ ] IP-based URLs use fallback_ip + assigned port.
- [ ] No port collisions (sequential assignment with conflict check).
- [ ] Wizard integrates without breaking existing flow.
