# TASKS (atomic roadmap)

## Structure
- Each Feature = one deliverable unit with 2-4 atomics.
- Atomics are the smallest executable work items.

## Execution order

### Phase 1 — CLI modularization (F01–F06)
Split bootstrap.ts into modular commands with standardized output.

### Phase 2 — depctl as canonical path (F07–F09)
Wrapper on PATH, close transition, rename repo.

### Phase 3 — CLI integration tests (F10–F13)
Harness, routing/JSON, snapshots/interactive, failure paths.

### Phase 4 — Operational (F14)
Upgrade path for existing installations.

### Phase 5 — Reverse proxy & SSL (F15–F21)
Caddy integration: automatic reverse proxy, domain/IP routing, SSL management.

| Feature | Description | Atomics |
|---------|-------------|---------|
| F15 | Caddy service bootstrap & port management | 3 |
| F16 | Caddyfile generation engine | 2 |
| F17 | Domain & IP routing | 3 |
| F18 | SSL management (off / self-signed / auto) | 3 |
| F19 | Proxy CLI commands | 3 |
| F20 | Deploy hooks for proxy updates | 2 |
| F21 | Proxy integration tests | 3 |

## Totals
- 21 features
- 57 atomics
