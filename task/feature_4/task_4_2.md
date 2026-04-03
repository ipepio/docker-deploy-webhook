# Task 4.2 — Implementar `secrets show`

## Objetivo

Mostrar los secrets de un repo con formato copiable a GitHub.

## Detalle

1. Leer tokens del `.env` del servicio.
2. Mostrar con la URL pública de la instancia.
3. Formato:

```
  DEPLOY_WEBHOOK_URL    = https://deploy.ipepio.com
  DEPLOY_WEBHOOK_BEARER = f8e7a80adf824ed5b...
  DEPLOY_WEBHOOK_HMAC   = 1b75e2340fd0096ee...
```

4. Opción `--json` para scripting.
5. Si no hay secrets generados, avisar y sugerir `secrets generate`.

## Criterios de aceptación

- [ ] Output directamente pegable en GitHub Secrets.
- [ ] Incluye URL pública de la instancia.
- [ ] Error claro si el repo no tiene secrets.
