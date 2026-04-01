# Task 5 - Motor de despliegue y rollback limitado

## Objetivo

Implementar la logica que ejecuta un despliegue real: preparar el archivo de variables runtime, ejecutar `docker compose pull` y `docker compose up -d`, verificar salud del servicio si esta configurado, guardar estado para rollback y ejecutar rollback automatico limitado si el despliegue falla despues de aplicar el nuevo tag.

---

## Dependencias previas

- Task 1: estructura `src/deploy/` creada.
- Task 2: config disponible con `getConfig()` y `getRepoConfig()`.
- Task 4: el worker llama a `runDeployEngine(job)` y espera un `DeployResult`.

---

## Quehaceres

### 5.1 Definir tipos del motor (`src/deploy/types.ts`)

```typescript
interface DeployContext {
  jobId: string;
  repository: string;
  environment: string;
  tag: string;
  imageName: string;
  composeFile: string;
  runtimeEnvFile: string;
  services: string[];
  timeouts: ResolvedTimeouts;
  healthcheck: ResolvedHealthcheck;
}

interface ResolvedTimeouts {
  pullTimeoutMs: number;
  upTimeoutMs: number;
  healthcheckTimeoutMs: number;
  healthcheckIntervalMs: number;
  retryAttempts: number;
  retryBackoffMs: number;
}

interface ResolvedHealthcheck {
  enabled: boolean;
  url?: string;
  timeoutMs: number;
  intervalMs: number;
}

interface DeployResult {
  status: 'success' | 'failed' | 'rolled_back' | 'rollback_failed';
  durationMs: number;
  error?: string;
  rollbackTag?: string;
  logs: string[];
}

interface RollbackState {
  successfulTag: string | null;
  previousTag: string | null;
  deployedAt: string | null;
  jobId: string | null;
}
```

### 5.2 Implementar el executor de comandos Docker (`src/deploy/executor.ts`)

Esta es la parte mas critica de seguridad. **Nunca construir strings de comando desde datos externos.**

**Funcion: `runDockerCompose(args: string[], opts: ExecOptions): Promise<ExecResult>`**

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface ExecOptions {
  timeoutMs: number;
  jobId: string;       // para loguear
  step: string;        // para loguear ('pull', 'up', 'rollback-pull', etc.)
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

Los argumentos se construyen como array separado:

```typescript
// CORRECTO
const args = [
  '-f', context.composeFile,
  '--env-file', context.runtimeEnvFile,
  'pull',
  ...context.services,
];
await runDockerCompose(args, opts);

// INCORRECTO - nunca hacer esto
exec(`docker compose -f ${composeFile} pull ${services.join(' ')}`);
```

Implementar con `AbortController` para timeouts:
```typescript
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
try {
  const { stdout, stderr } = await execFileAsync('docker', ['compose', ...args], {
    signal: controller.signal,
    maxBuffer: 10 * 1024 * 1024, // 10MB
  });
  return { stdout, stderr, exitCode: 0 };
} catch (err: any) {
  if (err.name === 'AbortError') throw new TimeoutError(`Step ${opts.step} timed out after ${opts.timeoutMs}ms`);
  return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', exitCode: err.code ?? 1 };
} finally {
  clearTimeout(timer);
}
```

Clasificar tipos de fallo (para decidir si reintentar):
- `TimeoutError`: fallo transitorio, reintentar.
- Codigo de salida distinto de 0 con stderr que contenga `network` o `timeout`: reintentar.
- Codigo de salida distinto de 0 con stderr de config/imagen invalida: no reintentar.

### 5.3 Implementar disco state store (`src/state/disk.store.ts`)

**Funcion: `readRollbackState(repo: string, env: string): RollbackState`**

```typescript
const path = `${STATE_DIR}/${repo.replace('/', '/')}/${env}.json`;
if (!fs.existsSync(path)) return { successfulTag: null, previousTag: null, ... };
return JSON.parse(fs.readFileSync(path, 'utf8'));
```

**Funcion: `writeRollbackState(repo, env, state: RollbackState): void`**

```typescript
fs.mkdirSync(dirname(path), { recursive: true });
fs.writeFileSync(path, JSON.stringify(state, null, 2), 'utf8');
```

Esta funcion es sincrona intencionalmente: el estado de rollback es critico y debe escribirse antes de continuar.

### 5.4 Implementar actualizacion del archivo runtime (`src/deploy/engine.ts`)

**Funcion: `writeRuntimeEnvFile(context: DeployContext): void`**

Escribe dos lineas en el `runtimeEnvFile`:
```
IMAGE_NAME=ghcr.io/owner/image
IMAGE_TAG=sha-abc1234
```

Comportamiento:
- Si el archivo ya existe, sobreescribir completamente (no hacer merge).
- Crear el directorio si no existe.
- Usar escritura sincrona: `fs.writeFileSync`.

Esto es lo que hace que el `docker compose up -d` use la nueva imagen.

### 5.5 Implementar healthcheck HTTP (`src/deploy/healthcheck.ts`)

**Funcion: `waitForHealthcheck(context: DeployContext): Promise<void>`**

```typescript
const start = Date.now();
while (Date.now() - start < context.healthcheck.timeoutMs) {
  try {
    const response = await axios.get(context.healthcheck.url!, {
      timeout: 5000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    if (response.status >= 200 && response.status < 300) return; // ok
  } catch {
    // no disponible aun, esperar
  }
  await sleep(context.healthcheck.intervalMs);
}
throw new HealthcheckTimeoutError(
  `Healthcheck failed after ${context.healthcheck.timeoutMs}ms`
);
```

### 5.6 Implementar motor principal de despliegue (`src/deploy/engine.ts`)

**Funcion principal: `runDeployEngine(job: DeployJob): Promise<DeployResult>`**

```typescript
const startTime = Date.now();
const logs: string[] = [];
const log = (msg: string) => {
  logs.push(`[${new Date().toISOString()}] ${msg}`);
  logger.info(msg, { jobId: job.id });
};

// 1. Resolver contexto desde config
const context = resolveDeployContext(job);

// 2. Leer estado actual para guardar previous_tag
const currentState = readRollbackState(job.payload.repository, job.payload.environment);
const previousTag = currentState.successfulTag ?? null;
log(`Previous successful tag: ${previousTag ?? 'none'}`);

// 3. Escribir runtime env file (punto de no retorno para rollback)
writeRuntimeEnvFile(context);
log(`Written runtime env: IMAGE_NAME=${context.imageName}, IMAGE_TAG=${job.payload.tag}`);

// A partir de aqui si falla intentamos rollback
try {
  // 4. docker compose pull (con reintentos para errores transitorios)
  log('Running docker compose pull...');
  await withRetry(() => runPull(context, log), context.timeouts);

  // 5. docker compose up -d
  log('Running docker compose up -d...');
  await runUp(context, log);

  // 6. Healthcheck opcional
  if (context.healthcheck.enabled) {
    log(`Waiting for healthcheck: ${context.healthcheck.url}`);
    await waitForHealthcheck(context);
    log('Healthcheck passed');
  }

  // 7. Exito: guardar estado
  writeRollbackState(job.payload.repository, job.payload.environment, {
    successfulTag: job.payload.tag,
    previousTag,
    deployedAt: new Date().toISOString(),
    jobId: job.id,
  });
  log('Deployment successful');

  return {
    status: 'success',
    durationMs: Date.now() - startTime,
    logs,
  };

} catch (deployError) {
  log(`Deployment failed: ${deployError}`);

  // Intentar rollback si hay previous_tag
  if (!previousTag) {
    log('No previous tag available, cannot rollback');
    return { status: 'failed', durationMs: Date.now() - startTime, error: String(deployError), logs };
  }

  log(`Attempting rollback to ${previousTag}...`);
  try {
    await runRollback(context, previousTag, log);

    if (context.healthcheck.enabled) {
      await waitForHealthcheck(context);
      log('Rollback healthcheck passed');
    }

    log(`Rollback successful, running on ${previousTag}`);
    return {
      status: 'rolled_back',
      durationMs: Date.now() - startTime,
      error: String(deployError),
      rollbackTag: previousTag,
      logs,
    };
  } catch (rollbackError) {
    log(`Rollback also failed: ${rollbackError}`);
    return {
      status: 'rollback_failed',
      durationMs: Date.now() - startTime,
      error: `Deploy: ${deployError} | Rollback: ${rollbackError}`,
      rollbackTag: previousTag,
      logs,
    };
  }
}
```

### 5.7 Implementar `runPull`, `runUp` y `runRollback` (`src/deploy/engine.ts`)

**`runPull(context, log)`**: ejecuta pull con reintentos:
```typescript
async function runPull(context: DeployContext, log: LogFn): Promise<void> {
  const args = ['-f', context.composeFile, '--env-file', context.runtimeEnvFile, 'pull', ...context.services];
  const result = await runDockerCompose(args, { timeoutMs: context.timeouts.pullTimeoutMs, ... });
  log(result.stdout);
  if (result.exitCode !== 0) throw new PullError(result.stderr);
}
```

**`runUp(context, log)`**: ejecuta up -d:
```typescript
async function runUp(context: DeployContext, log: LogFn): Promise<void> {
  const args = ['-f', context.composeFile, '--env-file', context.runtimeEnvFile, 'up', '-d', ...context.services];
  const result = await runDockerCompose(args, { timeoutMs: context.timeouts.upTimeoutMs, ... });
  log(result.stdout);
  if (result.exitCode !== 0) throw new UpError(result.stderr);
}
```

**`runRollback(context, previousTag, log)`**: igual que pull+up pero con el tag anterior:
```typescript
async function runRollback(context: DeployContext, previousTag: string, log: LogFn): Promise<void> {
  const rollbackContext = { ...context, tag: previousTag };
  writeRuntimeEnvFile(rollbackContext);  // sobreescribir con el tag anterior
  log(`Written rollback env: IMAGE_TAG=${previousTag}`);
  await runPull(rollbackContext, log);   // sin reintentos en rollback
  await runUp(rollbackContext, log);
}
```

### 5.8 Implementar `withRetry` (`src/deploy/retry.ts`)

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retryAttempts: number; retryBackoffMs: number },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.retryAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransientError(err)) throw err;  // no reintentar errores permanentes
      if (attempt < opts.retryAttempts) {
        await sleep(opts.retryBackoffMs * (attempt + 1));  // backoff lineal
      }
    }
  }
  throw lastError;
}
```

### 5.9 Resolver contexto desde config (`src/deploy/engine.ts`)

**Funcion: `resolveDeployContext(job: DeployJob): DeployContext`**

- Leer `getRepoConfig(job.payload.repository)`.
- Leer `envConfig = repoConfig.environments[job.payload.environment]`.
- Hacer merge de timeouts: defaults del servidor sobreescritos por overrides del entorno.
- Retornar `DeployContext` completo.

### 5.10 Tests del motor de despliegue

Crear `src/deploy/engine.test.ts` con mocks de `executor.ts`, `healthcheck.ts` y `disk.store.ts`:

- Despliegue exitoso completo: pull ok, up ok, healthcheck ok -> `success`.
- Despliegue exitoso sin healthcheck (disabled) -> `success`.
- Pull falla por red, reintenta, segundo intento ok -> `success`.
- Pull falla todas las veces -> `failed` (si no hay previous_tag) o empieza rollback.
- Up falla -> empieza rollback.
- Healthcheck falla despues del up -> empieza rollback.
- Rollback exitoso despues de fallo en up -> `rolled_back` con `rollbackTag`.
- Rollback tambien falla -> `rollback_failed`.
- No hay `previous_tag`: fallo sin intentar rollback -> `failed`.
- El archivo `runtimeEnvFile` se escribe correctamente con `IMAGE_NAME` e `IMAGE_TAG`.
- En rollback, `runtimeEnvFile` se sobreescribe con el tag anterior.
- Estado de disco se actualiza solo en `success` o `rolled_back`.

---

## Criterios de aceptacion

- [ ] Los comandos Docker se ejecutan con `execFile` y argumentos como array. Nunca con strings construidos.
- [ ] `docker compose pull` se reintenta solo para errores transitorios.
- [ ] El archivo `runtime_env_file` se escribe correctamente antes de pull y up.
- [ ] El healthcheck hace polling hasta timeout o primer 2xx.
- [ ] El rollback se intenta si y solo si el fallo ocurre despues de escribir el nuevo tag y existe `previous_tag`.
- [ ] El estado de rollback se persiste en disco al terminar con `success`.
- [ ] El resultado siempre incluye logs detallados del proceso.
- [ ] Tests cubren todos los caminos del motor incluido rollback y rollback_failed.
