# Atomic 15.2

## Objective
Port availability check and interactive permission prompt before binding 80/443.

## Details
- Before starting Caddy, check if ports 80 and 443 are in use (`net.createServer` probe or `lsof`).
- If occupied, show which process holds the port and abort with actionable error.
- If free, prompt the user: "Caddy needs to bind ports 80 and 443 on this machine. Allow? [y/N]"
- Store permission in `config/server.yml` under `proxy.ports_authorized: true` so it doesn't ask again.
- `depctl proxy init` triggers this flow.

## Acceptance criteria
- [ ] Port check detects occupied ports with clear error message.
- [ ] Permission prompt blocks until user confirms.
- [ ] Permission persisted in server.yml — not asked again after first approval.
- [ ] Denied permission aborts cleanly without starting Caddy.
