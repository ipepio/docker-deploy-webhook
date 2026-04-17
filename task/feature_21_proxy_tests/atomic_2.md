# Atomic 21.2

## Objective
Unit tests for URL resolution and IP detection.

## Details
Test cases for `resolveProxyUrl()`:
- Domain + ssl:auto → `https://domain`
- Domain + ssl:self-signed → `https://domain`
- Domain + ssl:off → `http://domain`
- No domain + ssl:off → `http://ip:port`
- No domain + ssl:self-signed → `https://ip:port`
- No domain + ssl:auto → validation error

Test cases for `detectMachineIp()`:
- Mock `os.networkInterfaces()` → returns private IP.
- Mock HTTP call → returns public IP.
- HTTP call timeout → falls back to private IP.

## Acceptance criteria
- [ ] All URL resolution cases covered.
- [ ] IP detection with mocked network interfaces.
- [ ] Fallback behavior on network failure.
