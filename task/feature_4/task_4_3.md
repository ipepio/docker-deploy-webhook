# Task 4.3 — Implementar `secrets rotate`

## Objetivo

Regenerar secrets de un repo invalidando los anteriores.

## Detalle

1. Generar nuevos Bearer + HMAC.
2. Sobreescribir los existentes en `.env`.
3. Mostrar los nuevos valores.
4. Avisar: "Actualiza los secrets en GitHub y reinicia el webhook".
5. Pedir confirmación antes de rotar (`Are you sure? The old secrets will stop working`).

## Criterios de aceptación

- [ ] Los secrets viejos dejan de funcionar tras restart del webhook.
- [ ] Confirmación obligatoria (o `--force`).
- [ ] Checklist post-rotación visible.
