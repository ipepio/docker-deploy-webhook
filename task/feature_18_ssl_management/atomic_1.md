# Atomic 18.1

## Objective
Caddyfile generation per SSL mode.

## Details
Update `generateCaddyfile()` to handle three modes:

**`ssl: off`**
```
http://app.example.com {
    reverse_proxy container:3000
}
```

**`ssl: self-signed`**
```
https://app.example.com {
    tls internal
    reverse_proxy container:3000
}
```

**`ssl: auto`** (Let's Encrypt)
```
app.example.com {
    reverse_proxy container:3000
}
```
(Caddy defaults to HTTPS with ACME when no scheme specified.)

**IP fallback (no domain):**
- `ssl: off` → `http://<ip>:<port> { ... }`
- `ssl: self-signed` → `https://<ip>:<port> { tls internal; ... }`
- `ssl: auto` not allowed without domain — validation error at config time.

Global block must include `email` for ACME if any route uses `ssl: auto`.

## Acceptance criteria
- [ ] Each SSL mode generates correct Caddyfile syntax.
- [ ] `ssl: auto` rejected for IP-only routes (no domain).
- [ ] ACME email required when at least one route uses auto.
- [ ] Generated Caddyfile passes `caddy validate`.
