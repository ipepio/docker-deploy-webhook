# Task 3.1 — Wizard de alta: preguntas básicas de repo

## Objetivo

Primera parte del wizard interactivo de `repo add`.

## Detalle

1. Pedir `repository` (owner/repo) — validar formato.
2. Inferir `image_name` automáticamente: `ghcr.io/<owner>/<repo>`.
3. Permitir override de imagen si el operador quiere otra registry.
4. Pedir nombre del primer entorno (default: `production`).
5. Pedir ramas/tags permitidos (default: `master` + `v*.*.*`).
6. Pedir workflows permitidos (default: `Release`).
7. Guardar config preliminar en `config/repos/<repo>.yml`.

## Criterios de aceptación

- [ ] Flujo interactivo con defaults sensatos (enter para aceptar).
- [ ] Validación de formato en cada input.
- [ ] Config YAML generada es válida para el validador existente.
