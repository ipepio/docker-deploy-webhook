# Task 2 - Carga y validacion de configuracion

## Objetivo

Implementar el sistema que lee `config/server.yml` y `config/repos/*.yml`, valida esquemas y tipos, resuelve secretos desde variables de entorno y garantiza que el servicio no arranca si hay cualquier problema critico de configuracion.

---

## Dependencias previas

- Task 1 completada: estructura `src/config/` creada, dependencias instaladas, logger disponible.

---

## Quehaceres

### 2.1 Definir tipos TypeScript de la configuracion (`src/config/schema.ts`)

Crear interfaces y tipos para representar la configuracion ya resuelta (con secretos en claro, no nombres de env vars):

```typescript
interface ServerConfig {
  id: string;
  port: number;
  history: {
    maxJobs: number;
    ttlSeconds: number;
  };
  rateLimit: {
    webhookPerMinute: number;
    adminPerMinute: number;
  };
  security: {
    replayWindowSeconds: number;
    adminReadToken: string;     // valor resuelto
    adminWriteToken: string;    // valor resuelto
  };
  defaults: DeployDefaults;
  notifications: ServerNotificationsConfig;
}

interface DeployDefaults {
  pullTimeoutMs: number;
  upTimeoutMs: number;
  healthcheckTimeoutMs: number;
  healthcheckIntervalMs: number;
  retryAttempts: number;
  retryBackoffMs: number;
}

interface RepoConfig {
  repository: string;           // owner/repo
  webhook: {
    bearerToken: string;        // valor resuelto
    hmacSecret: string;         // valor resuelto
  };
  environments: Record<string, EnvironmentConfig>;
}

interface EnvironmentConfig {
  imageName: string;
  composeFile: string;
  runtimeEnvFile: string;
  services: string[];
  allowedWorkflows: string[];
  allowedBranches: string[];
  allowedTagPattern: string;
  healthcheck: {
    enabled: boolean;
    url?: string;
    timeoutMs?: number;
    intervalMs?: number;
  };
  timeouts?: Partial<DeployDefaults>;
  notifications?: {
    telegram?: { chatIds: string[] };
    email?: { recipients: string[] };
  };
}

interface LoadedConfig {
  server: ServerConfig;
  repos: Map<string, RepoConfig>;  // key: "owner/repo"
}
```

### 2.2 Definir esquemas Zod para validacion del YAML (`src/config/schema.ts`)

Crear esquemas Zod que validen la estructura del YAML raw antes de resolverlo.
Los esquemas Zod deben validar el YAML tal como esta en disco (con nombres de env vars, no valores).

Esquema para `server.yml`:
```typescript
const ServerYamlSchema = z.object({
  server: z.object({
    id: z.string().min(1),
    port: z.number().int().min(1).max(65535).default(8080),
    history: z.object({
      max_jobs: z.number().int().min(1).default(250),
      ttl_seconds: z.number().int().min(60).default(604800),
    }),
    rate_limit: z.object({
      webhook_per_minute: z.number().int().min(1).default(30),
      admin_per_minute: z.number().int().min(1).default(60),
    }),
    security: z.object({
      replay_window_seconds: z.number().int().min(30).default(300),
      admin_read_token_env: z.string().min(1),
      admin_write_token_env: z.string().min(1),
    }),
    defaults: z.object({
      pull_timeout_ms: z.number().int().positive().default(300000),
      up_timeout_ms: z.number().int().positive().default(300000),
      healthcheck_timeout_ms: z.number().int().positive().default(60000),
      healthcheck_interval_ms: z.number().int().positive().default(5000),
      retry_attempts: z.number().int().min(0).max(5).default(2),
      retry_backoff_ms: z.number().int().positive().default(5000),
    }),
    notifications: z.object({ ... }).optional(),
  }),
});
```

Esquema para cada `repos/*.yml` similar pero con estructura de entornos.

### 2.3 Implementar `src/config/loader.ts`

Funcion principal: `loadConfig(): Promise<LoadedConfig>`

Pasos que debe seguir:

**Paso 1: Leer y parsear `server.yml`**
```typescript
const raw = fs.readFileSync(serverConfigPath, 'utf8');
const parsed = yaml.load(raw);
const validated = ServerYamlSchema.parse(parsed); // lanza ZodError si falla
```

**Paso 2: Resolver secretos de server.yml**
- Leer `DEPLOY_ADMIN_READ_TOKEN` y `DEPLOY_ADMIN_WRITE_TOKEN` del proceso.
- Si cualquiera esta vacia o no existe: lanzar `ConfigError` con mensaje descriptivo.
- Si Telegram esta `enabled: true`: resolver `bot_token_env` y verificar que no esta vacio.
- Si email esta `enabled: true`: resolver `resend_api_key_env` y verificar que no esta vacio.

**Paso 3: Leer y parsear todos los `repos/*.yml`**
- Hacer glob de `config/repos/*.yml`.
- Parsear y validar cada uno con el esquema Zod de repo.
- Si algun repo tiene schema invalido: acumular el error y lanzar al final con lista de todos los errores.

**Paso 4: Resolver secretos de cada repo**
- Para cada repo: leer `bearer_token_env` y `hmac_secret_env` del proceso.
- Si cualquiera esta vacia: lanzar `ConfigError` indicando repo y nombre de variable.

**Paso 5: Validar existencia de archivos del target**
- Para cada `environment` de cada repo:
  - Comprobar que `compose_file` existe en disco (`fs.existsSync`).
  - Comprobar que el directorio padre de `runtime_env_file` existe.
  - Si `healthcheck.enabled` y no hay `url`: lanzar `ConfigError`.
  - Si `services` esta vacio: lanzar `ConfigError`.

**Paso 6: Comprobar `allowed_tag_pattern` es una regex valida**
- Para cada entorno: `new RegExp(pattern)` en un try/catch.
- Si lanza: `ConfigError` indicando repo, entorno y pattern invalido.

**Paso 7: Construir y devolver `LoadedConfig`**
- Transformar todo el YAML snake_case a camelCase en los tipos TypeScript.
- Retornar el objeto `LoadedConfig` con el `Map<string, RepoConfig>` indexado por `owner/repo`.

### 2.4 Crear clase `ConfigError` (`src/config/errors.ts`)

```typescript
export class ConfigError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = 'ConfigError';
  }
}
```

### 2.5 Exponer la config como singleton (`src/config/index.ts`)

```typescript
let _config: LoadedConfig | null = null;

export async function initConfig(): Promise<LoadedConfig> {
  _config = await loadConfig();
  return _config;
}

export function getConfig(): LoadedConfig {
  if (!_config) throw new Error('Config not initialized');
  return _config;
}

export function getRepoConfig(repository: string): RepoConfig | undefined {
  return getConfig().repos.get(repository);
}
```

### 2.6 Integrar en `src/index.ts`

El arranque debe:
1. Llamar a `initConfig()`.
2. Si lanza `ConfigError` o `ZodError`: loguear el mensaje con detalle y llamar a `process.exit(1)`.
3. Solo continuar si la config es valida.

### 2.7 Tests de la carga de configuracion

Crear `src/config/loader.test.ts` con los siguientes casos:

- Carga correcta de un `server.yml` valido con todos los campos.
- Carga correcta con valores por defecto (campos opcionales omitidos).
- Error si `server.yml` no existe.
- Error si `server.yml` tiene campo requerido faltante.
- Error si `server.yml` tiene campo de tipo incorrecto.
- Error si la env var del token admin no existe.
- Error si la env var del token admin existe pero esta vacia.
- Error si Telegram esta enabled y falta el bot token.
- Carga correcta de un repo con todos sus campos.
- Error si el repo tiene `compose_file` que no existe en disco.
- Error si el repo tiene `allowed_tag_pattern` que no es regex valida.
- Error si el repo no tiene `services`.
- Error si la env var del bearer del repo no existe.
- El Map de repos esta indexado por `owner/repo` exactamente.

---

## Criterios de aceptacion

- [ ] `loadConfig()` devuelve `LoadedConfig` correctamente tipado con todos los campos resueltos.
- [ ] Los secretos nunca aparecen en el YAML cargado antes de resolverse; siempre se leen de env vars.
- [ ] El servicio no arranca si falta o esta mal cualquier campo critico.
- [ ] Los mensajes de error de config son descriptivos: indican que fallo y donde.
- [ ] Los tests cubren al menos los casos de exito y los casos de fallo criticos.
- [ ] No hay `any` en el modulo de config.
