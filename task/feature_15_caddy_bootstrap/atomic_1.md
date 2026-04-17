# Atomic 15.1

## Objective
Add Caddy service to docker-compose.yml with volume mount for Caddyfile and data persistence.

## Details
- Image: `caddy:2-alpine`
- Volumes: `./config/Caddyfile:/etc/caddy/Caddyfile`, `caddy_data:/data`, `caddy_config:/config`
- Shared Docker network with webhook and stacks.
- Ports 80 and 443 mapped to host (configurable).
- Restart policy: `unless-stopped`.

## Acceptance criteria
- [ ] Caddy service defined in docker-compose.yml.
- [ ] Volumes for Caddyfile, data, and config persist across restarts.
- [ ] Caddy shares network with webhook container and deployed stacks.
- [ ] No regression in existing services.
