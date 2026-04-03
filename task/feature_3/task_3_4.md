# Task 3.4 — Wizard de alta: checklist final para GitHub

## Objetivo

Mostrar un resumen accionable al terminar el alta completa.

## Detalle

Al finalizar `repo add`, mostrar:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Repo acme/payments-api configurado ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Añade estos secrets en GitHub:
  Settings → Secrets → Actions

  DEPLOY_WEBHOOK_URL    = https://deploy.ipepio.com
  DEPLOY_WEBHOOK_BEARER = f8e7a80adf824ed5b...
  DEPLOY_WEBHOOK_HMAC   = 1b75e2340fd0096ee...

  Stack en: /opt/stacks/acme/payments-api/

  Siguiente paso:
    depctl workflow generate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

1. Usar la URL pública configurada en `init`.
2. Incluir hint para generar workflow.
3. Recordar validar antes de reiniciar (`depctl validate`).

## Criterios de aceptación

- [ ] El operador puede copiar/pegar los secrets directamente a GitHub.
- [ ] No necesita ejecutar comandos adicionales para ver los secrets.
- [ ] URL del webhook se obtiene de la config de instancia.
