# Atomic 20.2

## Objective
Post-deploy proxy health verification.

## Details
- After a successful deploy, if the repo/env has proxy enabled:
  - Wait 2 seconds for container to be ready.
  - Hit the proxy URL (the public URL) to verify end-to-end connectivity.
  - Log result but don't fail the deploy — proxy issues are separate from deploy issues.
  - If proxy check fails, log warning: "Deploy succeeded but proxy health check failed. Run `depctl proxy status` to diagnose."
- This is informational only — deploy status is independent of proxy status.

## Acceptance criteria
- [ ] Post-deploy proxy check runs for proxy-enabled repos.
- [ ] Proxy check failure logged as warning, not error.
- [ ] Deploy status not affected by proxy check result.
- [ ] Skipped if proxy not initialized.
