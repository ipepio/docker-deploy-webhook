# Feature 4 — Secrets de webhook automáticos

## Objetivo

Generar, almacenar, rotar y mostrar secrets de webhook por repo de forma segura y autónoma.

## Contexto

Los secrets (Bearer + HMAC) son el puente entre GitHub Actions y el deployer. Hoy se generan con un comando separado. Queremos que se generen inline durante el alta y que la rotación sea sencilla.

## Resultado esperado

- Generación CSPRNG integrada en el flujo de alta
- `secrets show` para re-ver los valores
- `secrets rotate` para regenerar sin perder servicio
