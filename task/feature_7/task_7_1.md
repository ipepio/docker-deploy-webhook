# Task 7.1 — Wizard de generación de workflow

## Objetivo

Preguntas interactivas para construir el workflow.

## Detalle

1. Pedir repo (con autocompletado si hay repos configurados).
2. Preguntar trigger: ¿push de tag? ¿push a rama? ¿manual?
3. Preguntar si buildea Docker o solo notifica.
4. Preguntar registry (default: GHCR).
5. Preguntar nombre del workflow (default: `Release`).
6. Si hay varios entornos: preguntar qué rama/tag va a cada uno.

## Criterios de aceptación

- [ ] Wizard con defaults que funcionan en el caso más común (tag→production).
- [ ] Soporta caso multi-entorno (staging branch + production tag).
- [ ] No necesita flags si se ejecuta interactivamente.
