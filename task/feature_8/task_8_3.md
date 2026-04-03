# Task 8.3 — Soportar múltiples URLs/credenciales por entorno en workflow

## Objetivo

Permitir que distintos entornos apunten a distintos servidores.

## Detalle

1. El workflow puede enviar el webhook a URLs diferentes según entorno.
2. `workflow generate` soporta un bloque condicional por entorno.
3. Los secrets en GitHub se nombran por entorno: `DEPLOY_WEBHOOK_URL_PROD`, `_STAGING`.
4. `secrets show` muestra los secrets con el sufijo de entorno.

## Criterios de aceptación

- [ ] Un workflow puede deployar a 2+ servidores distintos.
- [ ] Nomenclatura de secrets es clara y predecible.
- [ ] `workflow generate` produce el routing correcto.
