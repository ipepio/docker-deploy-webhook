# Atomic 19.3

## Objective
`depctl proxy enable/disable <owner/repo>` — toggle proxy per repo without full reconfiguration.

## Details
- `depctl proxy enable <owner/repo> [--env production]`
  - Sets `proxy.enabled: true` in repo config.
  - If no domain or port configured, prompts for them.
  - Rebuilds Caddyfile + reloads.
  - Shows resulting URL.
- `depctl proxy disable <owner/repo> [--env production]`
  - Sets `proxy.enabled: false` in repo config.
  - Rebuilds Caddyfile (removes route) + reloads.
  - Confirms removal.
- Both update the YAML file and trigger rebuild.

## Acceptance criteria
- [ ] Enable adds route to Caddyfile and reloads.
- [ ] Disable removes route from Caddyfile and reloads.
- [ ] Enable prompts for missing config (domain, port).
- [ ] No regression on existing proxy routes.
