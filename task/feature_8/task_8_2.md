# Task 8.2 — Mejorar `repo show` con matriz de entornos

## Objetivo

Visualizar rápidamente todos los entornos de un repo con sus reglas.

## Detalle

1. `depctl repo show <org/repo>` muestra tabla:

```
  Env          Branches    Tags           Workflows   Stack
  production   master      v*.*.*         Release     /opt/stacks/.../production/
  staging      staging     -              Release     /opt/stacks/.../staging/
```

2. Incluir estado del último deploy por entorno si hay historial.

## Criterios de aceptación

- [ ] Visión clara de todos los entornos en una sola vista.
- [ ] Incluye paths de stacks.
- [ ] `--json` para scripting.
