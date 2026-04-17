# Atomic 16.2

## Objective
Atomic Caddyfile write + Caddy reload pipeline.

## Details
- `writeCaddyfile(content: string): void`
  - Write to `config/Caddyfile.tmp`.
  - Validate with `caddy validate --config /path/to/Caddyfile.tmp` (or via admin API).
  - If valid: rename `Caddyfile.tmp` → `Caddyfile` (atomic on same filesystem).
  - If invalid: delete tmp, throw `ProxyConfigError` with Caddy's error output.
- After successful write, call `reloadCaddy()` from F15.
- `rebuildAndReload()` — convenience function: generate → write → reload.

## Acceptance criteria
- [ ] Caddyfile never left in corrupt state (atomic rename).
- [ ] Validation failure aborts without touching active Caddyfile.
- [ ] Caddy reloaded only after successful write.
- [ ] Error messages include Caddy's validation output.
