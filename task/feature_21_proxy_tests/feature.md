# Feature 21 — Proxy integration tests

## Goal
Test suite for the entire proxy subsystem: Caddyfile generation, SSL modes, IP fallback, CLI commands, and lifecycle hooks.

## Definition of done
- Unit tests for Caddyfile generation (all SSL modes, domain vs IP, edge cases).
- Unit tests for IP detection and URL resolution.
- CLI integration tests for proxy commands.
- Config schema tests for proxy fields.
- Covered in CI.
