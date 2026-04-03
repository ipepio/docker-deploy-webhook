# Task 3.3 — Wizard de alta: creación de stack y servicios

## Objetivo

Generar el stack Docker Compose como parte del flujo de alta.

## Detalle

1. Preguntar: ¿necesita Postgres? ¿Redis? ¿Otros servicios auxiliares?
2. Preguntar servicios desplegables (default: `app` — basado en imagen del repo).
3. Generar `docker-compose.yml` en `/opt/stacks/<owner>/<repo>/`.
4. Generar `.env` del stack con placeholders seguros.
5. Generar `.deploy.env` inicial.
6. Actualizar la config del repo con `compose_file`, `runtime_env_file` y `services`.

## Criterios de aceptación

- [ ] Stack generado arranca sin errores de sintaxis compose.
- [ ] Servicios auxiliares (postgres, redis) tienen config funcional por defecto.
- [ ] Config del repo queda sincronizada con el stack generado.
