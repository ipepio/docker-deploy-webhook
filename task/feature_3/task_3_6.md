# Task 3.6 — Soporte `--non-interactive` para automatización

## Objetivo

Permitir ejecutar todos los comandos de gestión de repos sin interacción.

## Detalle

1. Si se pasan todos los flags necesarios, no preguntar nada.
2. Si falta algún flag requerido y estamos en `--non-interactive`, fallar con error claro.
3. Aplica a: `repo add`, `repo remove`, `env add`, `env edit`.
4. Útil para scripting, CI, y pruebas automatizadas.

## Criterios de aceptación

- [ ] `depctl repo add --repository org/repo --non-interactive` funciona sin stdin.
- [ ] Si falta info, error descriptivo (no se queda colgado esperando input).
- [ ] Mismo resultado que el wizard cuando se pasan los mismos valores.
