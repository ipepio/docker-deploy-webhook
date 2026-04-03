# Feature 7 — Generador interactivo de workflows

## Objetivo

Generar archivos `.github/workflows/release.yml` compatibles al 100% con la config real del deployer.

## Contexto

El error más común al integrar un repo es que el workflow tenga algo mal: nombre del workflow no coincide con `allowed_workflows`, `ref_name` de tags no matchea `allowed_branches`, secrets con nombres incorrectos. El generador elimina todas esas fuentes de error.

## Resultado esperado

- `depctl workflow generate` produce YAML listo
- Consistencia garantizada con la config del servidor
- Soporte multi-entorno (rama→webhook URL)
