# Task 9.2 — Fix: añadir `docker-cli-compose` al Dockerfile

## Objetivo

Corregir el error `unknown shorthand flag: 'f'` que ocurre porque el contenedor no tiene el plugin `docker compose`.

## Detalle

1. Cambiar en `Dockerfile`:
   ```
   RUN apk add --no-cache docker-cli docker-cli-compose
   ```
2. Verificar que `docker compose version` funciona dentro del contenedor.

## Criterios de aceptación

- [ ] `docker compose -f ... pull` funciona dentro del contenedor.
- [ ] Build sin errores.
