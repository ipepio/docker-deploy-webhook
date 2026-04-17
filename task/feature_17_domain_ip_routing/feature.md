# Feature 17 — Domain & IP routing

## Goal
Allow repos to declare a domain per environment. If no domain is configured, fall back to the machine's IP address for URL generation. Detect public/private IP automatically.

## Definition of done
- `proxy.domain` field in repo/env config schema.
- Machine IP auto-detection (public and private).
- URL generation: domain-based or IP-based fallback.
- Integrated into `depctl repo add` wizard.
- Covered by tests.
