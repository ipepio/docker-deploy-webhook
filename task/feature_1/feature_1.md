# Feature 1 — Instalación y bootstrap por script

## Objetivo

Permitir instalar `depctl` en cualquier servidor Linux con un único comando:

```bash
curl -sSL https://raw.githubusercontent.com/ipepio/depctl/main/install.sh | bash
```

El script deja el servidor listo para operar: servicio levantado, estructura creada, tokens generados y siguiente paso claro.

## Contexto

Hoy la instalación es manual: clonar repo, crear `.env`, copiar config, levantar compose. Queremos que sea un one-liner como `dokku`, `coolify` o `fly`.

## Resultado esperado

- Script idempotente (se puede ejecutar varias veces sin romper nada)
- Servicio `depctl` corriendo (webhook + redis)
- Config base generada (`/opt/depctl/config/server.yml`)
- Tokens admin creados y mostrados una sola vez
- Mensaje final con comandos siguientes
- Compatible con Ubuntu 22+/24+, Debian 12+ (otras distros best-effort)

## Fuera de alcance

- Soporte Windows/macOS
- Instalación sin Docker
- UI web
