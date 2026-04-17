# Atomic 15.3

## Objective
Caddy lifecycle management: start, stop, reload from depctl internals.

## Details
- `src/proxy/caddy.ts` module with functions:
  - `startCaddy()` — `docker compose up -d caddy`
  - `stopCaddy()` — `docker compose stop caddy`
  - `reloadCaddy()` — `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`
  - `isCaddyRunning()` — health check via `GET http://caddy:2019/config/` (Caddy admin API)
- All docker commands use `execFile` with array args (no shell interpolation).
- Reload validates Caddyfile before applying (Caddy does this natively, capture errors).

## Acceptance criteria
- [ ] Start/stop/reload functions work and handle errors.
- [ ] Reload failure does not take down running proxy.
- [ ] Health check returns Caddy status.
- [ ] No shell interpolation of external data.
