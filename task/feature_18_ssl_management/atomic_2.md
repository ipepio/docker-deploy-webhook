# Atomic 18.2

## Objective
Self-signed certificate generation for internal/dev use.

## Details
- Caddy handles self-signed natively with `tls internal` — no manual cert generation needed.
- Caddy's internal CA creates certs on first request and stores in `caddy_data` volume.
- Document that browsers will show warning for self-signed certs (expected).
- For IP-based routes with `ssl: self-signed`, Caddy generates cert for the IP SAN.

No custom code needed for cert generation — Caddy does it. This atomic is about:
1. Verifying `tls internal` works for both domain and IP routes.
2. Documenting the trust flow (how to trust Caddy's root CA if needed).
3. Adding `proxy.ssl` validation: `self-signed` and `off` work with IP, `auto` requires domain.

## Acceptance criteria
- [ ] `tls internal` works for domain-based routes.
- [ ] `tls internal` works for IP-based routes.
- [ ] Validation rejects `ssl: auto` without a domain.
- [ ] Documentation added for trusting self-signed certs.
