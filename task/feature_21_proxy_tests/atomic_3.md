# Atomic 21.3

## Objective
CLI integration tests for proxy commands.

## Details
Using existing CLI test harness (`src/test-utils/cli-harness.ts`):

- `depctl proxy init` — mock port check, verify server.yml updated.
- `depctl proxy status` — mock Caddy health, verify output format.
- `depctl proxy domains` — with mix of domain/IP routes, verify table output.
- `depctl proxy enable <repo>` — verify config updated and rebuild triggered.
- `depctl proxy disable <repo>` — verify route removed.
- `depctl proxy ssl <repo> --mode self-signed` — verify config and Caddyfile change.
- `depctl proxy ssl <repo> --mode auto` on IP-only route → error.
- JSON output mode for all commands.

## Acceptance criteria
- [ ] All proxy CLI commands tested.
- [ ] Human and JSON output modes verified.
- [ ] Error paths tested (not initialized, invalid mode, port occupied).
- [ ] Tests use existing harness patterns.
