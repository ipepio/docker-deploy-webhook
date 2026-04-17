# Atomic 20.1

## Objective
Hook Caddyfile rebuild into repo lifecycle events.

## Details
- After `depctl repo add` (if proxy configured): rebuild Caddyfile + reload.
- After `depctl repo remove`: rebuild Caddyfile (route removed) + reload.
- After `depctl repo edit` (if proxy fields changed): rebuild + reload.
- After `depctl env add/edit` (if proxy fields changed): rebuild + reload.
- Implementation: call `rebuildAndReload()` at the end of each CLI use-case that modifies proxy-relevant config.
- Guard: only rebuild if Caddy is initialized (`proxy.ports_authorized: true`). Skip silently if not.

## Acceptance criteria
- [ ] Adding a repo with proxy triggers Caddyfile update.
- [ ] Removing a repo removes its proxy route.
- [ ] Editing proxy fields triggers rebuild.
- [ ] No rebuild if Caddy not initialized.
