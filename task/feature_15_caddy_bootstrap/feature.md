# Feature 15 — Caddy service bootstrap & port management

## Goal
Add Caddy as reverse proxy container managed by depctl. Detect port availability (80/443), ask permission to bind, and manage Caddy lifecycle (start, stop, reload).

## Definition of done
- Caddy container added to docker-compose.yml with shared network.
- Port 80/443 availability check before binding.
- Interactive permission prompt before opening ports.
- Caddy start/stop/reload from depctl internals.
- Covered by tests.
