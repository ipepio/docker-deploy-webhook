# Task 6.1 — Mejorar salida de `depctl logs`

## Objetivo

Mostrar logs del último deploy (o de un job concreto) de forma legible.

## Detalle

1. `depctl logs <org/repo>` → logs del último deploy del repo.
2. `depctl logs <org/repo> --job <id>` → logs de un job específico.
3. Formato con timestamps, steps destacados y colores (si terminal lo soporta).
4. Indicar resultado final (success/failed/rolled_back).

## Criterios de aceptación

- [ ] Un comando para ver qué pasó en el último deploy.
- [ ] Steps (pull, up, healthcheck) claramente separados.
- [ ] `--json` para scripting.
