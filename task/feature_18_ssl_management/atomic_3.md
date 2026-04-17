# Atomic 18.3

## Objective
SSL toggle from CLI — change mode without editing YAML manually.

## Details
- `depctl proxy ssl <owner/repo> [--env production] --mode off|self-signed|auto`
- Reads repo config, updates `proxy.ssl` field, writes YAML.
- Validates new mode (auto requires domain).
- Triggers Caddyfile rebuild + reload.
- Shows new URL after change (http:// vs https://).
- `depctl proxy ssl <owner/repo>` without `--mode` shows current SSL status.

## Acceptance criteria
- [ ] Toggle changes SSL mode and rebuilds Caddyfile.
- [ ] Validation prevents invalid combinations.
- [ ] Shows updated URL after toggle.
- [ ] Read-only invocation shows current status.
