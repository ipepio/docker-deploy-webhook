# Task 1.6 — Mostrar resumen post-instalación

## Objetivo

Al terminar la instalación, mostrar un resumen claro y accionable.

## Detalle

Mostrar al final del script:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  depctl instalado correctamente ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Health:  http://localhost:8080/health
  Config:  /opt/depctl/config/
  Stacks:  /opt/stacks/

  Admin read token:  <token>
  Admin write token: <token>

  Siguiente paso:
    depctl repo add <org/repo>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

1. Incluir tokens solo si se generaron en esta ejecución.
2. Si los tokens ya existían, no mostrarlos (seguridad).
3. Incluir versión instalada si está disponible.

## Criterios de aceptación

- [ ] El operador sabe exactamente qué hacer después de instalar.
- [ ] No se filtran tokens preexistentes.
- [ ] Formato legible y sin ruido.
