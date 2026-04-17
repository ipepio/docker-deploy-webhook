# Feature 20 — Deploy hooks for proxy updates

## Goal
Automatically update Caddy routing when repos are added, removed, or deployed. The proxy stays in sync with the repo lifecycle without manual intervention.

## Definition of done
- Caddyfile rebuilt on repo add/remove/edit.
- Proxy entry cleaned up on repo removal.
- Deploy engine updates proxy if container name/port changes.
- Covered by tests.
