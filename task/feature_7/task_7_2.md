# Task 7.2 — Generación del YAML del workflow

## Objetivo

Producir el fichero `.yml` correcto a partir de las respuestas del wizard.

## Detalle

1. Generar workflow con:
   - Trigger configurado (tags, branches, manual).
   - Step de build Docker + push a GHCR.
   - Step de webhook con payload, headers y secrets correctos.
2. Payload del webhook incluye: `repository`, `environment`, `tag`, `sha`, `workflow`, `ref_name`, `run_id`.
3. Nombres de secrets sincronizados con lo que espera el servidor.
4. Si multi-entorno: generar bloque condicional (if branch X → webhook A, if tag → webhook B).

## Criterios de aceptación

- [ ] YAML generado es válido para GitHub Actions (sin errores de sintaxis).
- [ ] El nombre del workflow coincide con `allowed_workflows` del repo.
- [ ] Los secrets coinciden con los que `secrets show` reporta.
