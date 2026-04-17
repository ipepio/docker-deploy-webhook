# Feature 19 — Proxy CLI commands

## Goal
CLI surface for managing the reverse proxy: init, status, domains list, enable/disable per repo.

## Definition of done
- `depctl proxy init` — bootstrap Caddy with port permission.
- `depctl proxy status` — show Caddy health, active routes, SSL status.
- `depctl proxy domains` — list all configured domains/IPs with URLs.
- `depctl proxy enable/disable <owner/repo>` — toggle proxy per repo.
- Output follows existing CLI contract (human + JSON modes).
- Covered by tests.
