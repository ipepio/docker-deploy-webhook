# Task 6.2 — Implementar `depctl history`

## Objetivo

Mostrar historial de deploys por repo/entorno.

## Detalle

1. `depctl history <org/repo>` → últimos N deploys (default 10).
2. Columnas: fecha, tag, entorno, estado, duración.
3. `--limit N` para controlar cantidad.
4. `--env production` para filtrar entorno.

Ejemplo de salida:

```
  #  Date                 Tag      Env          Status     Duration
  1  2026-04-03 17:15     v0.0.1   production   success    12s
  2  2026-04-03 16:53     v0.0.1   production   failed     6s
  3  2026-04-03 10:50     v0.0.1   production   failed     1s
```

## Criterios de aceptación

- [ ] Tabla legible alineada.
- [ ] Filtro por entorno funciona.
- [ ] `--json` para scripting.
