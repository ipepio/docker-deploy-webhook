# Task 1.2 — Crear estructura de directorios estándar

## Objetivo

Crear el layout de carpetas que `depctl` espera en el servidor.

## Detalle

Crear si no existen:

```
/opt/depctl/              # raíz de la instalación
/opt/depctl/config/       # server.yml + repos/*.yml
/opt/depctl/config/repos/ # configs por repo
/opt/depctl/data/         # rollback state, job history
/opt/stacks/              # stacks de docker compose por repo
```

1. Usar `mkdir -p` (idempotente).
2. Setear permisos `root:root 755` para directorios.
3. Si `/opt/depctl` ya existe, no sobreescribir nada — solo crear lo que falte.

## Criterios de aceptación

- [ ] Ejecutar dos veces no produce errores ni duplicados.
- [ ] Permisos correctos en todos los directorios.
- [ ] Paths consistentes con los que usa el código fuente del proyecto.
