# Task 8.1 — Definir contrato multi-entorno en config

## Objetivo

Formalizar el modelo de datos de entornos por repo.

## Detalle

1. Cada entorno define: `allowed_branches`, `allowed_tag_pattern`, `allowed_workflows`.
2. Cada entorno puede tener su propio `compose_file` y `runtime_env_file`.
3. Validar que no hay solapamiento ambiguo (un ref_name que matchee dos entornos).
4. Documentar el contrato con ejemplos.

## Criterios de aceptación

- [ ] Un ref_name resuelve a máximo un entorno.
- [ ] Validación detecta solapamientos al guardar config.
- [ ] Documentación con ejemplo de production+staging.
