# Como integrar un repositorio nuevo

## 1. Preparar el stack en el servidor

1. Crear el directorio del stack, por ejemplo `/opt/stacks/mi-app/`.
2. Asegurar que `docker-compose.yml` usa `${IMAGE_NAME}:${IMAGE_TAG}` en los servicios a desplegar.
3. Elegir una ruta para el runtime env file, por ejemplo `/opt/stacks/mi-app/.deploy.env`.

Ejemplo base en `docs/examples/target-stack.example.yml`.

## 2. Autenticar Docker contra GHCR

```bash
docker login ghcr.io -u <usuario> -p <token-con-lectura-de-packages>
```

## 3. Crear la configuración del repo

Copiar `config/repos/example.repo.yml` a un archivo nuevo dentro de `config/repos/` y ajustar:

- `repository`: `owner/repo`
- `webhook.bearer_token_env`: nombre de la env var del Bearer
- `webhook.hmac_secret_env`: nombre de la env var del HMAC
- `environments.production.image_name`: imagen GHCR sin tag
- `environments.production.compose_file`: ruta absoluta al compose
- `environments.production.runtime_env_file`: ruta absoluta al `.deploy.env`
- `environments.production.services`: servicios a actualizar
- `environments.production.allowed_workflows`: nombre del workflow permitido
- `environments.production.allowed_branches`: ramas permitidas
- `environments.production.allowed_tag_pattern`: regex del tag

## 4. Generar y guardar secretos

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Usa uno como Bearer y otro como HMAC.

Añadirlos al `.env` del servicio:

```env
MI_APP_WEBHOOK_BEARER=<valor>
MI_APP_WEBHOOK_HMAC=<valor>
```

## 5. Configurar GitHub Actions

Añadir estos secrets en el repo de GitHub:

- `DEPLOY_WEBHOOK_URL`
- `DEPLOY_BEARER_TOKEN`
- `DEPLOY_HMAC_SECRET`

Y copiar/adaptar `.github/workflows/deploy.example.yml`.

## 6. Reiniciar el servicio

```bash
docker compose restart webhook
```

## 7. Verificar

1. Hacer push a la rama configurada.
2. Verificar que GitHub Actions publica la imagen y llama al webhook.
3. Consultar `/deployments/recent` con el token admin de lectura.
