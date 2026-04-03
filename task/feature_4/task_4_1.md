# Task 4.1 — Generación CSPRNG de secrets por repo

## Objetivo

Generar tokens Bearer y HMAC criptográficamente seguros.

## Detalle

1. Usar `crypto.randomBytes(32).toString('hex')` para cada token.
2. Guardar en el `.env` del servicio bajo nombres derivados del repo.
3. Formato de nombre: `<OWNER>_<REPO>_WEBHOOK_BEARER` / `_HMAC` (uppercase, guiones a underscore).
4. No sobreescribir si ya existen (salvo en `rotate`).

## Criterios de aceptación

- [ ] Tokens de mínimo 64 caracteres hex.
- [ ] Nombres de env vars son deterministas a partir del nombre del repo.
- [ ] Función reutilizable desde `repo add` y `secrets generate`.
