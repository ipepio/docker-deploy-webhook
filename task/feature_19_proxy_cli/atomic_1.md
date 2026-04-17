# Atomic 19.1

## Objective
`depctl proxy init` command — full bootstrap flow.

## Details
Flow:
1. Check if Caddy already initialized → if yes, show status and exit.
2. Detect machine IP (public + private).
3. Prompt: "Caddy needs ports 80 and 443. Allow? [y/N]"
4. Check port availability → error if occupied.
5. Store `proxy.ports_authorized: true` and `proxy.fallback_ip` in server.yml.
6. Generate initial Caddyfile (may be empty if no repos have proxy configured).
7. Start Caddy container.
8. Verify health.
9. Print summary: "Proxy running. Configure domains with `depctl repo add` or `depctl proxy ssl`."

Also ask for ACME email (optional): "Email for Let's Encrypt certificates (optional): "

## Acceptance criteria
- [ ] Full flow works end-to-end.
- [ ] Idempotent — running twice doesn't break anything.
- [ ] Stores config in server.yml.
- [ ] Starts Caddy and verifies health.
