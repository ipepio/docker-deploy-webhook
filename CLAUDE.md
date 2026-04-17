# CLAUDE.md — depctl

## What is this project?

**depctl** is a self-hosted deploy webhook server + CLI for Docker Compose stacks. It receives webhooks from GitHub Actions, validates auth (Bearer + HMAC + anti-replay), and deploys new images to locally-managed stacks. All admin operations happen via a local CLI/TUI — nothing sensitive is exposed over HTTP.

## Tech stack

- **Runtime**: Node.js ≥ 20, TypeScript (strict mode)
- **Framework**: Express (HTTP), BullMQ + Redis (job queue)
- **Config**: YAML (js-yaml) + Zod validation
- **Logging**: Winston (structured JSON in prod, readable in dev)
- **Notifications**: Telegram, Resend (email)
- **Tests**: Jest + Supertest
- **Linting**: ESLint + Prettier

## Quick commands

```bash
npm install              # Install dependencies (required first time)
npm run build            # TypeScript compile → dist/
npm test                 # Jest tests (32 tests, 11 suites)
npm run lint             # ESLint
npm run lint:fix         # ESLint with autofix
npm run format           # Prettier (src, docs, task)
npm run dev              # Dev server with nodemon
npm start                # Start webhook mode
npm run start:admin -- help  # Admin CLI
npm run check:branding   # Ensure no old "deployctl" references
npm run lint:all         # lint + branding check
```

## Project structure

```
src/
├── api/              # HTTP routes, middlewares, controllers
├── auth/             # Bearer, HMAC, anti-replay, admin tokens
├── cli/              # Local CLI/TUI for admin (v2)
├── config/           # YAML loading, Zod validation, types
├── deploy/           # Deploy engine, Docker executor, healthcheck, rollback
├── errors/           # Domain error classes (ConfigError, AuthError, etc.)
├── logger/           # Structured logger (Winston)
├── notifications/    # Telegram + Resend integrations
├── queue/            # Redis/BullMQ integration, global queue, worker
├── state/            # Disk + Redis persistence (history, rollback state)
├── utils/            # Shared utilities
├── test-utils/       # Test helpers
├── webhook/          # Webhook-specific logic
└── index.ts          # Entry point (webhook mode or admin mode)

config/               # Runtime config (server.yml, repos/*.yml)
docs/                 # Architecture docs, runbooks, troubleshooting
task/                 # Feature task breakdowns (14 features, 36 atomics)
```

## Conventions

### Naming
- Classes: `PascalCase`
- Functions/variables/props: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case.ts`
- Tests: `kebab-case.test.ts` (co-located with source)

### Code rules
- TypeScript strict — no implicit `any`
- Custom error classes per domain (`ConfigError`, `AuthError`, `DeployError`)
- Structured logging only — no `console.log`
- Never interpolate external data into shell commands — use `execFile`/`spawnSync` with array args
- Secrets in env vars only, never in YAML or code

### Config
- Server config: `config/server.yml`
- Per-repo config: `config/repos/<owner>--<repo>.yml`
- Stack root: `/opt/stacks/<owner>/<repo>/`
- Repository identifier always as `owner/repo`

## Security invariants (non-negotiable)

- Local config is authoritative — payloads never decide paths, compose files, services, or commands
- Secrets only in environment variables
- No shell command construction from external data
- Only `docker compose` on known, validated `compose_file` + `services`
- Auto deploys: `POST /deploy` with Bearer + HMAC + anti-replay only
- Admin writes: local CLI/TUI only, never via remote API

## Architecture overview

```
GitHub Actions → POST /deploy (Bearer+HMAC) → Express validates → BullMQ queue → Worker
Worker: pull → up -d → healthcheck → rollback if needed → persist state → notify
```

Two surfaces:
- **Remote**: POST /deploy, GET /health, GET /deployments/recent (GitHub Actions, monitoring)
- **Local**: depctl CLI/TUI (operator on the server)

## Testing notes

- Tests use Jest with `--runInBand` (sequential, since queue tests need isolation)
- Integration tests in `task/` feature dirs cover CLI behavior
- Run `npm install` before first test run

## Git & branching

- Main branch: `main`
- Feature branches: `pr/<feature-name>` or `feat/<feature-name>`
- PRs merge into `main`

## Important files

- `AGENTS.md` — detailed contracts for webhook, admin, queue, deploy engine, rollback
- `install.sh` — production installer script (idempotent, supports --upgrade)
- `docker-compose.yml` — dev/prod compose for the webhook service itself
- `.env.example` — required environment variables template
