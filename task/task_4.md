# Task 4 - Cola global y deduplicacion

## Objetivo

Implementar la cola de despliegues usando Redis/BullMQ con concurrencia 1, la logica de deduplicacion y sustitucion de pendientes, la persistencia de jobs y sus transiciones de estado, y la recuperacion ante reinicios del servicio.

---

## Dependencias previas

- Task 1: estructura `src/queue/` creada, Redis disponible en `docker-compose.yml`.
- Task 2: config cargada con `REDIS_URL` disponible.
- Task 3: el controlador `POST /deploy` ya necesita llamar a `enqueueDeployJob`.

---

## Quehaceres

### 4.1 Definir tipos de jobs (`src/queue/job.types.ts`)

```typescript
type JobStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'rolled_back'
  | 'rollback_failed'
  | 'cancelled';

interface DeployJobPayload {
  repository: string;       // owner/repo
  environment: string;
  tag: string;
  sha: string;
  workflow: string;
  refName: string;
  runId: number;
  triggeredBy: 'webhook' | 'admin';
  force: boolean;
}

interface DeployJob {
  id: string;               // UUID v4
  payload: DeployJobPayload;
  status: JobStatus;
  createdAt: string;        // ISO 8601
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
  rollbackTag?: string;
  logs: string[];           // lineas de log del despliegue
}
```

### 4.2 Conexion Redis (`src/queue/redis.ts`)

Crear y exportar el cliente Redis (ioredis) como singleton.

```typescript
import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null, // requerido por BullMQ
      enableReadyCheck: false,
    });
    client.on('error', (err) => logger.error('Redis error', { err }));
  }
  return client;
}
```

### 4.3 Definir la cola BullMQ (`src/queue/queue.ts`)

```typescript
import { Queue } from 'bullmq';

const QUEUE_NAME = 'deploy-jobs';

export const deployQueue = new Queue<DeployJobPayload>(QUEUE_NAME, {
  connection: getRedisClient(),
  defaultJobOptions: {
    removeOnComplete: false,    // los gestiona el State Store
    removeOnFail: false,
    attempts: 1,                // los reintentos los controla el motor
  },
});
```

### 4.4 Claves Redis para estado de jobs (`src/queue/keys.ts`)

Centralizar todos los nombres de claves Redis para evitar duplicaciones:

```typescript
export const RedisKeys = {
  job: (id: string) => `ddw:job:${id}`,
  jobsPending: (repo: string, env: string) => `ddw:pending:${repo}:${env}`,
  jobsRunning: () => `ddw:running`,
  recentJobs: (repo: string, env: string) => `ddw:recent:${repo}:${env}`,
  recentJobsAll: () => `ddw:recent:all`,
};
```

### 4.5 Implementar el Queue Manager (`src/queue/queue-manager.ts`)

Clase o modulo que encapsula toda la logica de encolado con deduplicacion.

**Funcion principal: `enqueueDeployJob(payload: DeployJobPayload): Promise<EnqueueResult>`**

```
EnqueueResult:
  - status: 'enqueued' | 'ignored_duplicate' | 'replaced_pending'
  - jobId: string
```

**Algoritmo de deduplicacion:**

```
1. Calcular dedupKey = `${repository}:${environment}:${tag}`

2. Buscar en Redis si existe un job para este dedupKey:
   - Leer RedisKeys.jobsPending(repository, environment)
   - Si hay un job pending con este MISMO tag:
     - Si force=false: retornar { status: 'ignored_duplicate', jobId: existingId }
     - Si force=true: continuar a paso 3

3. Buscar si hay un job pending (cualquier tag) para este repo+environment:
   - Si hay pending con DISTINTO tag:
     - Marcar el pending como 'cancelled'
     - Eliminar su referencia de RedisKeys.jobsPending
     - Continuar a encolar el nuevo

4. Crear nuevo job:
   - Generar UUID
   - Crear DeployJob con status='pending', createdAt=now
   - Persistir en Redis: SET RedisKeys.job(id) JSON TTL=ttlSeconds
   - Guardar referencia: SET RedisKeys.jobsPending(repo, env) id TTL=ttlSeconds
   - Encolar en BullMQ: deployQueue.add(id, payload, { jobId: id })
   - Retornar { status: 'enqueued', jobId: id }
```

**Funcion: `getJob(id: string): Promise<DeployJob | null>`**
- Leer de Redis: `GET ddw:job:<id>`.
- Parsear JSON y retornar.

**Funcion: `updateJobStatus(id: string, updates: Partial<DeployJob>): Promise<void>`**
- Leer el job actual.
- Merge con updates.
- Persistir de vuelta.
- Si el nuevo estado es `running`: actualizar `RedisKeys.jobsRunning()`.
- Si el nuevo estado es terminal (`success`, `failed`, `rolled_back`, `rollback_failed`):
  - Limpiar `RedisKeys.jobsRunning()`.
  - Limpiar `RedisKeys.jobsPending(repo, env)` si apuntaba a este job.
  - Añadir a las listas de recientes.

**Funcion: `addToRecentJobs(job: DeployJob): Promise<void>`**
- `LPUSH ddw:recent:<repo>:<env> <job_id>` seguido de `LTRIM ... 0 <max_jobs-1>`.
- `LPUSH ddw:recent:all <job_id>` seguido de `LTRIM ... 0 <max_jobs-1>`.

**Funcion: `getRecentJobs(repo?: string, env?: string, limit?: number): Promise<DeployJob[]>`**
- Si se pasan repo y env: leer de `ddw:recent:<repo>:<env>`.
- Si no: leer de `ddw:recent:all`.
- Resolver IDs a jobs completos via `getJob`.
- Retornar array ordenado por `createdAt` descendente.

### 4.6 Implementar el Worker (`src/queue/worker.ts`)

```typescript
import { Worker } from 'bullmq';

export function startWorker(): Worker {
  const worker = new Worker<DeployJobPayload>(
    QUEUE_NAME,
    async (bullJob) => {
      const jobId = bullJob.id!;
      const job = await getJob(jobId);
      if (!job) throw new Error(`Job ${jobId} not found in Redis`);

      await updateJobStatus(jobId, {
        status: 'running',
        startedAt: new Date().toISOString(),
      });

      try {
        const result = await runDeployEngine(job);   // Task 5
        await updateJobStatus(jobId, {
          status: result.status,
          finishedAt: new Date().toISOString(),
          durationMs: result.durationMs,
          error: result.error,
          rollbackTag: result.rollbackTag,
          logs: result.logs,
        });
        await addToRecentJobs(await getJob(jobId)!);
        await sendNotification(job, result);         // Task 7
      } catch (err) {
        await updateJobStatus(jobId, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          error: String(err),
        });
        await sendNotification(job, { status: 'failed', error: String(err) });
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 1,               // UN UNICO JOB A LA VEZ
      autorun: true,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('Worker job failed', { jobId: job?.id, err });
  });

  return worker;
}
```

### 4.7 Recuperacion ante reinicios (`src/queue/recovery.ts`)

Funcion: `recoverInterruptedJobs(): Promise<void>`

Se llama desde `src/index.ts` ANTES de arrancar el worker.

```typescript
export async function recoverInterruptedJobs(): Promise<void> {
  const runningId = await redis.get(RedisKeys.jobsRunning());
  if (!runningId) return;

  const job = await getJob(runningId);
  if (!job) {
    await redis.del(RedisKeys.jobsRunning());
    return;
  }

  if (job.status === 'running') {
    logger.warn('Found interrupted running job, marking as failed', {
      jobId: runningId,
      repository: job.payload.repository,
    });
    await updateJobStatus(runningId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      error: 'Service restarted while job was running',
    });
    await addToRecentJobs(await getJob(runningId)!);
    // No enviar notificacion de reinicio para no generar ruido
  }

  await redis.del(RedisKeys.jobsRunning());
}
```

### 4.8 Tests de cola y deduplicacion

Crear `src/queue/queue-manager.test.ts`:

**Deduplicacion:**
- Encolar job A. Encolar exactamente el mismo job (mismo tag). Debe devolver `ignored_duplicate` con el mismo `job_id`.
- Encolar job A (tag 1). Encolar job B mismo repo+env pero distinto tag. Job A debe quedar `cancelled`. Job B debe quedar `pending`.
- Encolar job A (tag 1). Encolar job A otra vez con `force=true`. Debe encolar aunque sea duplicado.

**Estados:**
- Job empieza como `pending`.
- Al procesarse pasa a `running`.
- Al terminar pasa a `success`, `failed`, `rolled_back` o `rollback_failed`.

**Concurrencia:**
- Si hay un job en `running`, el siguiente espera en `pending` y no se ejecuta hasta que el primero termina.

**Historial:**
- Los jobs terminados aparecen en `getRecentJobs`.
- La lista no supera `max_jobs` (LTRIM funciona).

**Recuperacion:**
- Si al arrancar existe un job en `running`, se marca `failed`.
- Si no hay job en `running`, no hace nada.

---

## Criterios de aceptacion

- [ ] `enqueueDeployJob` devuelve `job_id` siempre, incluso para duplicados.
- [ ] Jobs duplicados (mismo tag) se ignoran correctamente.
- [ ] Jobs pendientes del mismo repo+env se sustituyen por el ultimo.
- [ ] El worker procesa exactamente un job a la vez.
- [ ] El estado de cada job se persiste en Redis con TTL.
- [ ] Los jobs sobreviven a reinicios del servicio.
- [ ] Los jobs `running` interrumpidos por reinicio se marcan `failed` al arrancar.
- [ ] `getRecentJobs` devuelve el historial correctamente limitado.
- [ ] Tests cubren deduplicacion, sustitucion de pendientes y recuperacion.
