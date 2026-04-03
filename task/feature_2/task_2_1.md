# Task 2.1 — Implementar `depctl init`

## Objetivo

Wizard de primera configuración de instancia.

## Detalle

1. Preguntar interactivamente:
   - URL pública del webhook (ej: `https://deploy.midominio.com`)
   - Puerto (default 8080)
   - Path de stacks (default `/opt/stacks`)
2. Escribir valores en `config/server.yml` y `.env`.
3. Si ya existe config previa, mostrar valores actuales como defaults.
4. Validar que la URL es accesible si se proporciona (best-effort, no bloquear si falla).
5. Reiniciar webhook si la config cambió.

## Criterios de aceptación

- [ ] Primera ejecución deja una instancia funcional.
- [ ] Re-ejecución permite actualizar sin perder el resto de la config.
- [ ] URL pública queda persistida para uso en `workflow generate` y `secrets show`.
