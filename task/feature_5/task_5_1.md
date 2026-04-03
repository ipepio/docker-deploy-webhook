# Task 5.1 — Preflight pull de imagen durante `repo add`

## Objetivo

Probar el pull de la imagen al dar de alta un repo para detectar problemas de auth temprano.

## Detalle

1. Tras inferir `image_name`, intentar `docker pull <image>:latest` (o un tag conocido).
2. Si el pull funciona → continuar sin más.
3. Si falla con `unauthorized` o `denied` → disparar flujo de login (Task 5.2).
4. Si falla por otra razón (network, registry down) → avisar pero no bloquear el alta.
5. El check es best-effort: no impide crear el repo si el operador quiere continuar.

## Criterios de aceptación

- [ ] Se intenta pull automáticamente al dar de alta.
- [ ] Error de auth dispara flujo guiado, no un mensaje críptico.
- [ ] Errores no relacionados con auth no bloquean.
