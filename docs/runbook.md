# Runbook operativo

## Arranque

```bash
docker compose up -d
```

## Logs

```bash
docker compose logs -f webhook
```

## Healthcheck del servicio

```bash
curl https://deploy.mi-dominio.com/health
```

## Despliegues recientes

```bash
curl https://deploy.mi-dominio.com/deployments/recent \
  -H "Authorization: Bearer <admin_read_token>"
```

## Ver un job concreto

```bash
curl https://deploy.mi-dominio.com/jobs/<job_id> \
  -H "Authorization: Bearer <admin_read_token>"
```

## Deploy manual

```bash
curl -X POST https://deploy.mi-dominio.com/admin/deploy \
  -H "Authorization: Bearer <admin_write_token>" \
  -H "Content-Type: application/json" \
  -d '{"repository":"owner/repo","environment":"production","tag":"sha-abc1234"}'
```

## Redeploy del último exitoso

```bash
curl -X POST https://deploy.mi-dominio.com/admin/deploy/redeploy-last-successful \
  -H "Authorization: Bearer <admin_write_token>" \
  -H "Content-Type: application/json" \
  -d '{"repository":"owner/repo","environment":"production"}'
```

## Reintentar un job fallido

```bash
curl -X POST https://deploy.mi-dominio.com/admin/jobs/<job_id>/retry \
  -H "Authorization: Bearer <admin_write_token>"
```

## Rotación de secretos

1. Generar nuevos valores.
2. Actualizar el `.env` del servicio.
3. Actualizar los secrets del repo en GitHub.
4. Reiniciar el servicio.

## Diagnóstico rápido

Fallas comunes:

- falta una env var obligatoria
- `compose_file` no existe
- `allowed_tag_pattern` es inválida
- el host no puede hacer pull desde GHCR
- Redis no está disponible
