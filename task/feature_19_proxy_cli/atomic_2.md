# Atomic 19.2

## Objective
`depctl proxy status` and `depctl proxy domains` commands.

## Details

**`depctl proxy status`:**
```
Proxy:     running (Caddy 2.x)
Ports:     80, 443
IP:        203.0.113.5 (public) / 10.0.0.2 (private)
Routes:    3 active
SSL:       2 auto, 1 self-signed, 0 off
```
- Checks Caddy health via admin API.
- Counts active routes from repo configs.
- JSON mode: `--json` flag.

**`depctl proxy domains`:**
```
REPO                  ENV          DOMAIN                  SSL          URL
acme/payments-api     production   pay.acme.com            auto         https://pay.acme.com
acme/frontend         production   —                       self-signed  https://203.0.113.5:8100
acme/internal-tool    staging      —                       off          http://203.0.113.5:8101
```
- Table format, one row per repo/env with proxy enabled.
- JSON mode: `--json` flag.

## Acceptance criteria
- [ ] Status shows Caddy health, ports, IP, route count, SSL breakdown.
- [ ] Domains lists all proxy-enabled routes with URLs.
- [ ] Both commands support `--json`.
- [ ] Graceful output when Caddy not initialized.
