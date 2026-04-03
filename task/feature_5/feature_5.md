# Feature 5 — Detección y setup de GHCR auth

## Objetivo

Detectar automáticamente si una imagen requiere autenticación y guiar al operador para resolverlo sin salir del wizard.

## Contexto

Hoy si la imagen es privada en GHCR, el operador descubre el error en el primer deploy (401/403). Queremos detectarlo en el momento del alta y resolverlo ahí mismo.

## Resultado esperado

- Preflight pull durante `repo add`
- Flujo guiado de login GHCR si falla
- Credenciales persistidas correctamente para el daemon Docker del host
