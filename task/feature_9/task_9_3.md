# Task 9.3 — Catálogo de errores con mensajes accionables

## Objetivo

Cada error común tiene un mensaje que dice qué hacer para resolverlo.

## Detalle

Errores a cubrir:

| Error | Mensaje accionable |
|-------|-------------------|
| 401 unauthorized (GHCR) | "Ejecuta `depctl repo add` para configurar credenciales GHCR" |
| 403 denied (GHCR) | "El token no tiene scope `read:packages`. Crea un PAT clásico..." |
| 403 Branch not allowed | "ref_name `X` no está en allowed_branches ni matchea tag pattern" |
| 403 Workflow not allowed | "Workflow `X` no está en allowed_workflows. Valores actuales: ..." |
| Compose file not found | "El fichero X no existe. Ejecuta `depctl stack init`" |
| Docker socket error | "No se puede acceder al socket Docker. ¿Está Docker corriendo?" |

1. Centralizar en un módulo de errores.
2. Cada error tiene código, mensaje human y sugerencia.

## Criterios de aceptación

- [ ] Ningún error muestra solo un código sin contexto.
- [ ] Cada error sugiere al menos un comando o acción para resolverlo.
