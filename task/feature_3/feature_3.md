# Feature 3 — Gestión de repos interactiva

## Objetivo

Dar de alta, editar, listar y eliminar repos sin tocar YAML. El wizard de alta es la pieza central: guía al operador paso a paso.

## Contexto

El `repo add` actual funciona pero pide flags manuales. Queremos que sea completamente interactivo: detecte imagen, pregunte entornos, genere secrets, cree stack, y al final muestre todo lo que hay que copiar a GitHub.

## Resultado esperado

- Alta completa en un solo flujo
- Edición y eliminación seguras
- Modo `--non-interactive` para CI
