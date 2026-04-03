# Task 5.3 — Persistencia de credenciales GHCR para el contenedor webhook

## Objetivo

Asegurar que las credenciales de GHCR están disponibles donde las necesita el daemon Docker que ejecuta el pull.

## Detalle

1. El login se hace en el host → escribe `/root/.docker/config.json`.
2. El contenedor webhook usa el docker socket del host → el pull lo ejecuta el daemon del host.
3. Verificar que el daemon del host lee las credenciales correctas.
4. Si el contenedor necesita montar el config, añadirlo al `docker-compose.override.yml`.
5. Documentar claramente dónde viven las credenciales y por qué.

## Criterios de aceptación

- [ ] Pull funciona tanto desde host directo como desde dentro del contenedor webhook.
- [ ] Credenciales sobreviven a recreación del contenedor.
- [ ] Documentado para que el operador entienda por qué se monta el docker config.
