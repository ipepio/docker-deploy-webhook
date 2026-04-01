# docker-deploy-webhook

Servicio de despliegue automatizado por servidor. Recibe webhooks de GitHub Actions y actualiza stacks Docker Compose locales en base a una configuracion declarativa en YAML.

## Objetivo

Permitir que varios repositorios publiquen imagenes Docker privadas en `GHCR` y que, cuando un workflow de GitHub Actions termine correctamente, el servidor objetivo reciba un webhook, valide la peticion y despliegue la nueva version de forma segura en su propio host Docker, sin intervencion manual.

## Que problema resuelve

Actualmente, desplegar una nueva version de un servicio en un servidor requiere conectarse por SSH, hacer pull de la imagen y reiniciar manualmente. Este proyecto automatiza ese flujo completo:

1. El desarrollador hace push a `main`.
2. GitHub Actions construye la imagen, la publica en GHCR y llama al webhook.
3. El servidor valida la peticion, encola el despliegue y lo ejecuta.
4. Si algo falla, intenta rollback al tag anterior conocido.
5. Se envian notificaciones del resultado.

## Que debe hacer

- Exponer un webhook publico (`POST /deploy`) por servidor.
- Validar `Bearer token` + firma `HMAC` + proteccion anti-replay.
- Resolver `repository + environment` contra configuracion YAML local.
- Aceptar solo payload minimo; la fuente de verdad es la config del servidor.
- Encolar despliegues en Redis con cola global secuencial (un job a la vez).
- Si llegan varios despliegues del mismo `repo + environment`, conservar solo el ultimo pendiente.
- Ignorar duplicados del mismo `repo + environment + tag`.
- Actualizar variables estandar `IMAGE_NAME` e `IMAGE_TAG` en el archivo runtime del target.
- Ejecutar `docker compose pull` y `docker compose up -d` para los servicios configurados.
- Ejecutar healthchecks HTTP opcionales configurados por target.
- Hacer rollback automatico limitado si el despliegue falla despues de aplicar el cambio y existe un `previous_tag` fiable.
- Guardar historial corto en Redis y estado estable en disco para rollback.
- Exponer endpoints admin protegidos de lectura y escritura.
- Permitir despliegues manuales, redeploy del ultimo exitoso y retry de jobs fallidos.
- Enviar notificaciones opcionales por Telegram y email (Resend) en exito y fallo.

## Que NO debe hacer en el MVP

- No controlar Docker remoto ni otros servidores.
- No aceptar comandos arbitrarios desde el payload o desde la config.
- No autodesplegarse.
- No depender de la API de GitHub para validar cada despliegue.
- No gestionar `docker login`; el host ya debe tener acceso a GHCR.
- No generar ni modificar archivos `docker-compose.yml`.

## Topologia esperada

```text
+------------------+       +------------------+       +------------------+
|  GitHub Actions  |       |  GitHub Actions  |       |  GitHub Actions  |
|  (repo A)        |       |  (repo B)        |       |  (repo A)        |
+--------+---------+       +--------+---------+       +--------+---------+
         |                          |                          |
         v                          v                          v
+--------+---------+       +--------+---------+       +--------+---------+
|  Servidor 1      |       |  Servidor 1      |       |  Servidor 2      |
|  webhook:8080    |       |  webhook:8080    |       |  webhook:8080    |
|  (repo A + B)    |       |  (repo A + B)    |       |  (solo repo A)   |
+------------------+       +------------------+       +------------------+
```

- Se instala una instancia del servicio por servidor.
- Cada servidor tiene su propia URL de webhook.
- Cada servidor gestiona solo sus propios stacks Docker Compose.
- GitHub Actions puede llamar a una o varias URLs si un repo debe desplegar en varios servidores.
- La coordinacion multi-server la hace GitHub Actions, no este servicio.

## Stack tecnologico

- Runtime: Node.js + TypeScript
- HTTP: Express
- Cola: Redis (BullMQ o similar)
- Config: YAML en disco
- Contenedorizacion: Docker + Docker Compose
- Notificaciones: Telegram Bot API + Resend
- Ejecucion Docker: via socket del host (`/var/run/docker.sock`)

## Decisiones cerradas

| Aspecto                      | Decision                                                 |
| ---------------------------- | -------------------------------------------------------- |
| Arquitectura                 | Una instancia por servidor                               |
| Cola                         | Global por servidor, secuencial                          |
| Trigger                      | GitHub Actions llama directamente al webhook             |
| Registry                     | GHCR (imagenes privadas)                                 |
| Tags                         | Inmutables (ej. `sha-abc1234`)                           |
| Compose                      | Ya existe en el servidor; usa `IMAGE_NAME` e `IMAGE_TAG` |
| Config                       | YAML en disco: `server.yml` + `repos/*.yml`              |
| Secretos                     | Fuera del YAML, en variables de entorno                  |
| Autenticacion webhook        | Bearer + HMAC + anti-replay por repo                     |
| Autenticacion admin          | Dos tokens: lectura y escritura                          |
| Historial                    | Corto en Redis (~250 jobs / 7 dias)                      |
| Estado rollback              | Disco + Redis                                            |
| Rollback                     | Automatico limitado (solo si hay `previous_tag`)         |
| Notificaciones               | Telegram + Resend, opcionales, en exito y fallo          |
| Rate limiting                | En webhook y endpoints admin                             |
| Config reload                | Solo al arrancar                                         |
| Arranque con config invalida | Fail fast                                                |
| Jobs running interrumpidos   | Se marcan como fallidos                                  |
| Duplicados mismo tag         | Se ignoran                                               |
| Pendientes mismo repo+env    | Se conserva solo el ultimo                               |
| Deploy manual                | Soportado via admin con restricciones del target         |
| Force redeploy               | Solo desde admin con flag `force`                        |
| Timeouts/retries             | Globales con override por repo/environment               |
| Destinos notificacion        | Globales con override por repo/environment               |

## Estructura del repositorio

```text
.
├── AGENTS.md                          # Reglas para agentes de desarrollo
├── README.md                          # Este archivo
├── docs/
│   └── arquitectura.md                # Diseno tecnico detallado
├── config/
│   ├── server.example.yml             # Ejemplo de config base del servidor
│   └── repos/
│       └── example.repo.yml           # Ejemplo de config de un repo
├── task/
│   ├── task_1.md                      # Bootstrap del proyecto
│   ├── task_2.md                      # Carga y validacion de config
│   ├── task_3.md                      # Webhook automatico y seguridad
│   ├── task_4.md                      # Cola global y deduplicacion
│   ├── task_5.md                      # Motor de despliegue y rollback
│   ├── task_6.md                      # Observabilidad y administracion
│   ├── task_7.md                      # Notificaciones
│   └── task_8.md                      # Empaquetado, ejemplos y tests
├── src/                               # Codigo fuente (por crear)
├── Dockerfile                         # Imagen del servicio (por crear)
├── docker-compose.yml                 # Stack del servicio + Redis (por crear)
├── package.json                       # Dependencias (por crear)
├── tsconfig.json                      # Config TypeScript (por crear)
├── .env.example                       # Variables de entorno (por crear)
└── .gitignore                         # Exclusiones de git
```

## Contrato del webhook

**Headers:**

```
Authorization: Bearer <token-del-repo>
X-Deploy-Timestamp: <unix-seconds>
X-Deploy-Signature: sha256=<hex>
Content-Type: application/json
```

**Body:**

```json
{
  "repository": "owner/repo",
  "environment": "production",
  "tag": "sha-abc1234",
  "sha": "abc1234567890",
  "workflow": "deploy-production",
  "ref_name": "main",
  "run_id": 123456789
}
```

**Firma:**

```
signature = HMAC_SHA256(hmac_secret, timestamp + "." + raw_body)
```

**Respuesta exitosa:**

```json
{ "status": "accepted", "job_id": "uuid" }
```

## Endpoints

| Metodo | Ruta                                     | Auth          | Descripcion                |
| ------ | ---------------------------------------- | ------------- | -------------------------- |
| `POST` | `/deploy`                                | Bearer + HMAC | Webhook automatico         |
| `GET`  | `/health`                                | Ninguna       | Estado basico del servicio |
| `GET`  | `/jobs/:id`                              | Admin read    | Estado de un job           |
| `GET`  | `/deployments/recent`                    | Admin read    | Historial reciente         |
| `POST` | `/admin/deploy`                          | Admin write   | Deploy manual              |
| `POST` | `/admin/deploy/redeploy-last-successful` | Admin write   | Redeploy ultimo exitoso    |
| `POST` | `/admin/jobs/:id/retry`                  | Admin write   | Reintentar job fallido     |

## Siguiente paso

Ejecutar `task/task_1.md`: bootstrap del proyecto con esqueleto tecnico en Node.js + TypeScript.

## Instalacion en produccion

1. Asegurar que el servidor tiene `Docker`, `Docker Compose v2` y acceso de lectura a `GHCR`.
2. Copiar `config/server.example.yml` a `config/server.yml` y ajustar valores.
3. Crear uno o varios archivos dentro de `config/repos/` a partir de `config/repos/example.repo.yml`.
4. Crear `.env` a partir de `.env.example` con los tokens admin y secretos por repo.
5. Levantar el servicio con `docker compose up -d`.
6. Consultar `GET /health` para confirmar que Redis y el worker estan operativos.
7. Para integrar un repo nuevo, seguir `docs/how-to-add-repo.md`.
8. Para operacion diaria, ver `docs/runbook.md`.
