# Task 9.1 — Fix crítico: validador `ref_name` para tags

## Objetivo

Corregir el bug que encontramos hoy: `ref_name` de un tag push es el nombre del tag (ej: `v0.0.1`), no una branch. El validador actual lo rechaza como "Branch is not allowed".

## Detalle

1. En `validateDeployAgainstConfig`, si `ref_name` no está en `allowedBranches`:
   - Comprobar si matchea `allowedTagPattern`.
   - Si matchea → aceptar.
   - Si no matchea ninguno → rechazar.
2. Actualizar tests.

## Criterios de aceptación

- [ ] Tags como `v0.0.1` pasan validación sin estar en `allowedBranches`.
- [ ] Branches normales siguen validándose contra `allowedBranches`.
- [ ] Tests cubren ambos casos.
