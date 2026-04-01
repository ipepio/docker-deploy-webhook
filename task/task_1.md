# Task 1 - Bootstrap del proyecto y esqueleto tecnico

## Objetivo

Dejar el proyecto compilable, ejecutable en contenedor y con una estructura de directorios que no necesite rehacerse en tareas posteriores. Esta tarea no implementa logica de negocio; prepara el terreno para todo lo demas.

---

## Dependencias previas

Ninguna. Esta es la primera tarea.

---

## Quehaceres

### 1.1 Inicializar `package.json`

Crear `package.json` con:
- `name`: `docker-deploy-webhook`
- `version`: `0.1.0`
- `main`: `dist/index.js`
- Scripts:
  - `dev`: `nodemon --exec ts-node -r tsconfig-paths/register src/index.ts`
  - `build`: `tsc`
  - `start`: `node dist/index.js`
  - `lint`: `eslint src --ext .ts`
  - `lint:fix`: `eslint src --ext .ts --fix`
  - `format`: `prettier --write "src/**/*.ts"`
  - `test`: `jest`
  - `test:watch`: `jest --watch`
  - `test:coverage`: `jest --coverage`

Dependencias de produccion:
- `express`
- `ioredis`
- `bullmq`
- `js-yaml`
- `zod` (validacion de esquemas de config y payload)
- `winston` (logger)
- `express-rate-limit`
- `rate-limit-redis`
- `axios` (healthcheck HTTP y notificaciones)
- `resend`
- `uuid`
- `module-alias`

Dependencias de desarrollo:
- `typescript`
- `ts-node`
- `tsconfig-paths`
- `nodemon`
- `@types/express`
- `@types/node`
- `@types/js-yaml`
- `@types/uuid`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint`
- `eslint-config-prettier`
- `eslint-plugin-prettier`
- `prettier`
- `jest`
- `ts-jest`
- `@types/jest`

### 1.2 Crear `tsconfig.json`

Configurar con:
- `target`: `ES2020`
- `module`: `commonjs`
- `strict`: `true`
- `esModuleInterop`: `true`
- `outDir`: `./dist`
- `rootDir`: `./src`
- `baseUrl`: `./src`
- `paths`: alias `@/*` -> `*` para imports limpios dentro de `src/`
- `resolveJsonModule`: `true`
- `declaration`: `true`
- `skipLibCheck`: `true`

### 1.3 Crear estructura de directorios `src/`

```text
src/
├── config/
│   ├── loader.ts          # Lectura del YAML y resolucion de secretos
│   ├── schema.ts          # Tipos TypeScript y esquemas Zod de la config
│   └── index.ts           # Exporta la config ya cargada y validada
├── api/
│   ├── server.ts          # Creacion y configuracion del servidor Express
│   ├── router.ts          # Definicion de rutas
│   ├── middlewares/
│   │   ├── rate-limiter.ts
│   │   └── error-handler.ts
│   └── controllers/
│       ├── deploy.controller.ts    # POST /deploy
│       ├── health.controller.ts    # GET /health
│       ├── jobs.controller.ts      # GET /jobs/:id, GET /deployments/recent
│       └── admin.controller.ts     # POST /admin/*
├── auth/
│   ├── webhook.auth.ts    # Validacion Bearer, HMAC y anti-replay
│   └── admin.auth.ts      # Validacion tokens admin
├── queue/
│   ├── queue.ts           # Definicion de la cola Redis/BullMQ
│   ├── worker.ts          # Worker con concurrencia 1
│   ├── job.types.ts       # Tipos de job, estados, metadata
│   └── deduplication.ts   # Logica de deduplicacion y sustitucion de pendientes
├── deploy/
│   ├── engine.ts          # Motor principal de despliegue
│   ├── executor.ts        # Ejecucion de comandos Docker (execFile)
│   ├── healthcheck.ts     # Polling HTTP de healthcheck
│   └── rollback.ts        # Logica de rollback limitado
├── state/
│   ├── redis.store.ts     # Operaciones de historial y estado en Redis
│   └── disk.store.ts      # Lectura/escritura de estado de rollback en disco
├── notifications/
│   ├── notifier.ts        # Orquestador de notificaciones
│   ├── telegram.ts        # Envio via Telegram Bot API
│   └── email.ts           # Envio via Resend
├── logger/
│   └── index.ts           # Configuracion de Winston
└── index.ts               # Punto de entrada: carga config, arranca cola y servidor
```

### 1.4 Implementar `src/index.ts` (bootstrap minimo)

El punto de entrada debe seguir este orden:
1. Cargar y validar configuracion (llamar al modulo config).
2. Conectar con Redis (verificar conexion antes de continuar).
3. Revisar jobs `running` huerfanos y marcarlos `failed`.
4. Arrancar el worker de la cola.
5. Arrancar el servidor HTTP.
6. Loguear `Server listening on port <PORT>`.

Si cualquier paso de arranque falla, el proceso debe terminar con `process.exit(1)` y un mensaje claro.

### 1.5 Implementar logger (`src/logger/index.ts`)

Usar Winston con dos transportes:
- Desarrollo (`NODE_ENV !== 'production'`): formato legible en consola con nivel `debug`.
- Produccion: formato JSON con nivel `info`.

Campos estandar en todos los logs:
- `timestamp`
- `level`
- `message`
- `service`: siempre `docker-deploy-webhook`

El logger debe exportarse como singleton.

### 1.6 Implementar servidor HTTP base (`src/api/server.ts`)

- Crear app Express.
- Aplicar `express.json()` solo para rutas que no necesitan raw body.
- Para `POST /deploy`: capturar el raw body antes de parsear JSON (necesario para HMAC).
- Registrar el router principal.
- Registrar el middleware de errores al final.
- Exportar la app sin llamar a `listen` (el listen lo hace `index.ts`).

### 1.7 Implementar `GET /health` basico

Responder `200 OK` con:
```json
{
  "status": "ok",
  "server_id": "<id del servidor>",
  "uptime_seconds": <numero>
}
```

### 1.8 Crear `Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

Imagen base: `node:20-alpine` para minimo footprint.
El socket Docker se monta en tiempo de ejecucion, no en la imagen.

### 1.9 Crear `docker-compose.yml` del servicio

```yaml
services:
  webhook:
    build: .
    container_name: docker-deploy-webhook
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./config:/app/config:ro
      - ./data:/app/data
    env_file:
      - .env
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    container_name: deploy-webhook-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
```

### 1.10 Crear `.env.example`

```env
# Entorno
NODE_ENV=production

# Redis
REDIS_URL=redis://redis:6379

# Tokens admin
DEPLOY_ADMIN_READ_TOKEN=
DEPLOY_ADMIN_WRITE_TOKEN=

# Telegram (opcional)
DEPLOY_TELEGRAM_BOT_TOKEN=

# Resend (opcional)
DEPLOY_RESEND_API_KEY=

# Por cada repo configurado, añadir:
# <REPO_NAME>_WEBHOOK_BEARER=
# <REPO_NAME>_WEBHOOK_HMAC=
```

### 1.11 Crear `.eslintrc.js` y `.prettierrc`

ESLint con reglas TypeScript estrictas.
Prettier con:
- `singleQuote: true`
- `trailingComma: 'all'`
- `printWidth: 100`
- `semi: true`

### 1.12 Crear `jest.config.js`

Configurar `ts-jest` para ejecutar tests TypeScript directamente.
Mapear alias `@/*` igual que en `tsconfig.json`.
Cobertura sobre `src/**/*.ts` excluyendo `index.ts` y tipos.

---

## Criterios de aceptacion

- [ ] `npm run build` compila sin errores ni warnings.
- [ ] `npm run lint` pasa sin errores.
- [ ] `docker compose up` arranca el servicio y Redis correctamente.
- [ ] `GET /health` responde `200` con el JSON esperado.
- [ ] El servicio termina con `process.exit(1)` y mensaje claro si Redis no esta disponible.
- [ ] La estructura de directorios `src/` esta creada y lista para las siguientes tareas.
- [ ] El logger emite JSON en produccion y formato legible en desarrollo.
- [ ] `npm test` ejecuta (sin tests aun, pero sin errores de configuracion).
