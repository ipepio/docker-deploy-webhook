# Task 1.5 — Levantar servicio con Docker Compose

## Objetivo

Arrancar `webhook + redis` con Docker Compose y verificar que están sanos.

## Detalle

1. Ejecutar `docker compose up -d` desde `/opt/depctl/`.
2. Esperar hasta 30 segundos a que `redis` pase healthcheck.
3. Esperar hasta 30 segundos a que `webhook` responda en `/health`.
4. Si alguno no arranca:
   - Mostrar logs relevantes (`docker compose logs --tail 20`).
   - Salir con código 1.
5. Si todo OK, mostrar mensaje de éxito con la URL del health.

## Criterios de aceptación

- [ ] Servicio levantado y respondiendo en `/health` al terminar el script.
- [ ] Si falla, logs visibles sin que el operador tenga que buscarlos.
- [ ] Idempotente: si ya están corriendo, no los recrea innecesariamente.
