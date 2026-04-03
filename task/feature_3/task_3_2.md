# Task 3.2 — Wizard de alta: generación automática de secrets

## Objetivo

Integrar la generación de secrets dentro del flujo de `repo add`.

## Detalle

1. Tras crear la config del repo, generar `Bearer` y `HMAC` automáticamente.
2. Guardarlos en `.env` del servicio.
3. Mostrarlos al final del wizard.
4. No requerir un comando separado (`repo secrets generate`) — se hace inline.

## Criterios de aceptación

- [ ] Al terminar `repo add`, los secrets ya están generados y guardados.
- [ ] Se muestran una vez en stdout con formato copiable.
- [ ] Si se re-ejecuta `repo add` para un repo que ya existe, avisar y no machacar secrets.
