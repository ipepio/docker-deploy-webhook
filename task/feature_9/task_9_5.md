# Task 9.5 — Documentación de troubleshooting y release checklist

## Objetivo

Documentar problemas comunes y definir proceso de release.

## Detalle

1. Crear `docs/troubleshooting.md`:
   - GHCR 401/403 y cómo resolverlo
   - Branch vs tag en ref_name
   - Compose plugin faltante
   - DB schema no inicializado (Prisma baseline)
   - Secrets mal configurados
2. Crear `docs/release-checklist.md`:
   - Tests pasan
   - Build exitoso
   - Dockerfile correcto
   - Changelog actualizado
   - Tag semver

## Criterios de aceptación

- [ ] Troubleshooting cubre los 5+ problemas que encontramos hoy.
- [ ] Release checklist es ejecutable paso a paso.
