# Task 3.5 — Implementar `repo remove` con confirmación

## Objetivo

Eliminar un repo de forma segura.

## Detalle

1. Pedir confirmación explícita (`Type repo name to confirm`).
2. Borrar `config/repos/<repo>.yml`.
3. Borrar secrets del repo del `.env` del servicio.
4. Preguntar: ¿borrar también el stack en `/opt/stacks/`? (default: no).
5. Avisar de reiniciar webhook tras eliminar.

## Criterios de aceptación

- [ ] No se puede borrar sin confirmación explícita.
- [ ] El stack queda intacto por defecto (seguridad — puede tener datos).
- [ ] Secrets del `.env` se limpian.
