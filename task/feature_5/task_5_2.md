# Task 5.2 — Flujo guiado de login GHCR

## Objetivo

Si el preflight detecta auth requerida, guiar al operador para hacer login.

## Detalle

1. Mostrar: "La imagen requiere autenticación en ghcr.io".
2. Preguntar usuario de GitHub (default: owner del repo).
3. Preguntar token (PAT clásico con `read:packages`).
4. Ejecutar `docker login ghcr.io -u <user> --password-stdin`.
5. Si login OK → reintentar pull para confirmar.
6. Si login falla → mostrar qué scope necesita y cómo crear el PAT.
7. Si pull sigue fallando (scope insuficiente, ej: `denied`) → explicar diferencia entre `unauthorized` (no logged in) y `denied` (scope/permisos).

## Criterios de aceptación

- [ ] El operador no necesita buscar documentación externa.
- [ ] Login queda persistido en el host para futuros pulls.
- [ ] Mensajes diferentes para "no logged in" vs "permisos insuficientes".
