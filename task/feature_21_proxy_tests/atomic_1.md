# Atomic 21.1

## Objective
Unit tests for Caddyfile generation engine.

## Details
Test cases for `generateCaddyfile()`:
- Zero repos → valid empty Caddyfile (global block only).
- One repo, one env, domain + ssl:auto → correct server block.
- One repo, one env, domain + ssl:self-signed → `tls internal` block.
- One repo, one env, domain + ssl:off → `http://` prefix.
- One repo, no domain, IP fallback + port → `http://ip:port` block.
- Multiple repos → sorted deterministic output.
- Repo with proxy disabled → excluded from output.
- ACME email in global block when ssl:auto present.
- No ACME email when no ssl:auto routes.

Test cases for `writeCaddyfile()`:
- Valid content → file written and renamed.
- Invalid content → tmp deleted, error thrown, original untouched.

## Acceptance criteria
- [ ] All generation cases covered.
- [ ] Atomic write/validation covered.
- [ ] Tests run without Docker or Caddy (mock exec calls).
