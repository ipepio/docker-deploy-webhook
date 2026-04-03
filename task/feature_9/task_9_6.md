# Task 9.6 — Renombrar proyecto a `depctl`

## Objetivo

Unificar branding del proyecto.

## Detalle

1. Renombrar en `package.json`: `name: "depctl"`.
2. Actualizar help text: `depctl` en vez de `deployctl`.
3. Actualizar `README.md`, docs, comentarios.
4. Actualizar nombres de contenedores en `docker-compose.yml` (optional, evaluable).
5. Mantener compatibilidad: `deployctl` como alias temporal si es necesario.
6. Actualizar repo de GitHub: evaluar si renombrar el repo también.

## Criterios de aceptación

- [ ] `depctl help` funciona.
- [ ] Docs y README dicen `depctl` consistentemente.
- [ ] No hay referencias rotas a `deployctl` en el código.
