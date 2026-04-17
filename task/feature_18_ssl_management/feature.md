# Feature 18 — SSL management

## Goal
Three SSL modes per route: `off` (HTTP only), `self-signed` (HTTPS with generated cert), `auto` (Let's Encrypt via Caddy ACME). Toggle from CLI without editing files.

## Definition of done
- SSL mode configurable per repo/environment.
- Self-signed certificate generation for development/internal use.
- Let's Encrypt automatic via Caddy for real domains.
- Toggle SSL on/off from CLI.
- Caddyfile generated correctly for each mode.
- Covered by tests.
