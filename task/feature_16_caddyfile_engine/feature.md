# Feature 16 — Caddyfile generation engine

## Goal
Generate and maintain the Caddyfile automatically from repo/environment configurations. Each repo+env with a domain or IP route gets a reverse proxy block. Atomic writes + reload.

## Definition of done
- Caddyfile generated from all active repo configs.
- Each repo/env produces a reverse proxy server block.
- Atomic write (temp file → rename) prevents corrupt state.
- Caddy reload after every Caddyfile change.
- Covered by tests.
