# Task 6.3 — Consolidar `rollback` como comando de primer nivel

## Objetivo

Hacer rollback accesible y claro.

## Detalle

1. `depctl rollback <org/repo>` → vuelve al último tag exitoso.
2. Equivalente al `redeploy-last-successful` actual pero más directo.
3. Mostrar: "Rolling back to v0.0.1 (previous successful tag)".
4. Si no hay tag anterior, error claro.
5. Pedir confirmación salvo `--force`.

## Criterios de aceptación

- [ ] Un solo comando para rollback.
- [ ] Muestra qué tag se va a restaurar antes de ejecutar.
- [ ] Error claro si no hay tag anterior.
