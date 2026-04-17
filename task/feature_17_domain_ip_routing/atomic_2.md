# Atomic 17.2

## Objective
Machine IP auto-detection for domain-less routing.

## Details
- `src/proxy/ip-detect.ts` module.
- `detectMachineIp(): { public: string | null, private: string }` 
  - Private: from `os.networkInterfaces()`, first non-loopback IPv4.
  - Public: HTTP call to `https://api.ipify.org` or `https://ifconfig.me` with 5s timeout.
  - Cache result in memory (IP doesn't change mid-session).
  - If public detection fails, fall back to private IP with warning.
- On `depctl proxy init`, detect and store in `server.yml` as `proxy.fallback_ip`.
- User can override manually in server.yml.

## Acceptance criteria
- [ ] Detects private IP from network interfaces.
- [ ] Detects public IP via external service with timeout.
- [ ] Graceful fallback if public detection fails.
- [ ] Result stored in server.yml for offline use.
