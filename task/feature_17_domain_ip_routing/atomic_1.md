# Atomic 17.1

## Objective
Extend repo config schema with proxy fields.

## Details
Add to environment config in Zod schema (`src/config/schema.ts`):
```yaml
proxy:
  enabled: true                    # default false
  domain: app.example.com          # optional, omit for IP fallback
  container_port: 3000             # port the app listens on inside container
  ssl: auto | self-signed | off    # default off
```

- `proxy.enabled` — whether this env gets a reverse proxy entry.
- `proxy.domain` — optional. If absent, URL uses machine IP + auto-assigned port.
- `proxy.container_port` — the port inside the Docker container to proxy to.
- `proxy.ssl` — SSL mode for this route.

Add to server config:
```yaml
proxy:
  ports_authorized: false          # set to true after port permission prompt
  acme_email: ""                   # for Let's Encrypt (required if any env uses ssl: auto)
  fallback_ip: ""                  # auto-detected, can be overridden
```

## Acceptance criteria
- [ ] Zod schema validates proxy fields.
- [ ] Existing configs without proxy fields still load (all optional with defaults).
- [ ] Config loader resolves proxy fields per environment.
