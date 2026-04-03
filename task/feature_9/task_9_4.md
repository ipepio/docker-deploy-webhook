# Task 9.4 — Tests de flujos críticos

## Objetivo

Cubrir con tests los paths que más fallan en producción.

## Detalle

Tests a añadir:

1. **Validador de deploy**: ref_name como tag vs branch.
2. **Auth webhook**: Bearer + HMAC + anti-replay.
3. **Config loader**: repo con múltiples entornos.
4. **Secrets**: generación, persistencia, rotación.
5. **Stack init**: compose generado es válido.

Usar jest (ya configurado) con mocks de Docker/Redis cuando sea necesario.

## Criterios de aceptación

- [ ] Tests pasan en CI sin Docker real.
- [ ] Cubren los 3 bugs que encontramos hoy.
- [ ] `npm test` pasa sin errores.
