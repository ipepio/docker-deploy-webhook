# Task 3 - Webhook automatico y seguridad

## Objetivo

Implementar el endpoint `POST /deploy` con todas sus capas de seguridad: autenticacion por repo (`Bearer + HMAC`), proteccion anti-replay por timestamp, validacion del payload contra la config local y rate limiting. Solo peticiones completamente validas deben llegar a la capa de cola.

---

## Dependencias previas

- Task 1: servidor Express base y estructura `src/api/` y `src/auth/`.
- Task 2: config cargada y disponible via `getConfig()` y `getRepoConfig()`.

---

## Quehaceres

### 3.1 Capturar raw body para HMAC (`src/api/middlewares/raw-body.ts`)

El HMAC se calcula sobre el body exactamente como llego en la peticion HTTP, antes de cualquier parseo. Express por defecto parsea JSON y pierde el raw body.

Implementar un middleware que:
- Solo actue en `POST /deploy`.
- Use `express.raw({ type: 'application/json' })` para capturar el buffer.
- Guarde el buffer en `req.rawBody` (extender los tipos de Express).
- Parsee el JSON manualmente: `JSON.parse(req.rawBody.toString('utf8'))`.
- Si el body no es JSON valido: responder `400 Bad Request` con `{ error: 'invalid_json' }`.

```typescript
// src/types/express.d.ts
declare namespace Express {
  interface Request {
    rawBody?: Buffer;
  }
}
```

### 3.2 Implementar autenticacion del webhook (`src/auth/webhook.auth.ts`)

Funcion: `authenticateWebhook(req: Request): AuthResult`

**Paso 1: Extraer y validar headers**
```
Authorization: Bearer <token>
X-Deploy-Timestamp: <unix-seconds>
X-Deploy-Signature: sha256=<hex>
```
Si falta cualquier header: retornar error `missing_headers`.

**Paso 2: Extraer `repository` del body**
- Leer `req.body.repository` (ya parseado del raw body en paso anterior).
- Si no existe o no es string: retornar error `missing_repository`.
- Formato esperado: `owner/repo`. Validar con regex `/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/`.

**Paso 3: Resolver config del repo**
- `getRepoConfig(repository)`.
- Si no existe: retornar error `unknown_repository`.
  - IMPORTANTE: No revelar si el repo es desconocido vs token incorrecto. Usar siempre el mismo mensaje de error `unauthorized`.

**Paso 4: Validar ventana temporal (anti-replay)**
- Parsear `X-Deploy-Timestamp` como numero entero (unix seconds).
- Calcular `delta = Math.abs(Date.now() / 1000 - timestamp)`.
- Si `delta > replayWindowSeconds`: retornar error `replay_detected`.
- El check temporal se hace ANTES de verificar HMAC para evitar ataques de timing.

**Paso 5: Validar Bearer token**
- Extraer token del header `Authorization: Bearer <token>`.
- Comparar con `repoConfig.webhook.bearerToken` usando `crypto.timingSafeEqual`.
- Si no coincide: retornar error `unauthorized`.

**Paso 6: Calcular y validar firma HMAC**
```typescript
const message = `${timestamp}.${req.rawBody!.toString('utf8')}`;
const expected = crypto
  .createHmac('sha256', repoConfig.webhook.hmacSecret)
  .update(message)
  .digest('hex');
const received = signatureHeader.replace('sha256=', '');
const valid = crypto.timingSafeEqual(
  Buffer.from(expected, 'hex'),
  Buffer.from(received, 'hex'),
);
```
Si no coincide: retornar error `invalid_signature`.

**Importante:** Usar siempre `timingSafeEqual` para comparaciones de secretos. Nunca `===`.

### 3.3 Implementar validacion del payload (`src/api/validators/deploy.validator.ts`)

Despues de la autenticacion, validar el payload completo con Zod:

```typescript
const DeployPayloadSchema = z.object({
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  environment: z.string().min(1).max(100),
  tag: z.string().min(1).max(200),
  sha: z.string().min(7).max(64),
  workflow: z.string().min(1).max(200),
  ref_name: z.string().min(1).max(200),
  run_id: z.number().int().positive(),
});
```

Despues de la validacion de tipos, validar contra la config del repo:

**Funcion:** `validateDeployPayload(payload, repoConfig): ValidationResult`

1. `environment` debe existir en `repoConfig.environments`. Si no: error `unknown_environment`.
2. `workflow` debe estar en `envConfig.allowedWorkflows`. Si no: error `workflow_not_allowed`.
3. `ref_name` debe estar en `envConfig.allowedBranches`. Si no: error `branch_not_allowed`.
4. `tag` debe cumplir `new RegExp(envConfig.allowedTagPattern).test(tag)`. Si no: error `tag_pattern_mismatch`.

Si cualquier validacion falla: responder `403 Forbidden` con `{ error: 'forbidden' }` (sin detalles internos).

### 3.4 Implementar el controlador `POST /deploy` (`src/api/controllers/deploy.controller.ts`)

```
POST /deploy
  |
  |--> rawBodyMiddleware (capturar body raw)
  |--> rateLimiter (webhook)
  |--> authenticateWebhook -> 401 si falla
  |--> validateDeployPayload -> 403 si falla
  |--> enqueueDeployJob -> llama al Queue Manager
  |--> responder 202 { status: 'accepted', job_id: '<uuid>' }
```

El controlador debe:
- No loguear el contenido del Bearer ni del HMAC.
- Loguear la peticion recibida con: `repository`, `environment`, `tag`, `run_id`.
- Loguear el resultado: `accepted` con `job_id`, o el tipo de error.

### 3.5 Implementar rate limiting (`src/api/middlewares/rate-limiter.ts`)

Usar `express-rate-limit` con store Redis (`rate-limit-redis`).

Crear dos instancias:
- `webhookRateLimiter`: `webhook_per_minute` requests por IP por ventana de 60 segundos.
- `adminRateLimiter`: `admin_per_minute` requests por IP por ventana de 60 segundos.

Configuracion:
- `keyGenerator`: IP del cliente (confiar en `X-Forwarded-For` si hay reverse proxy).
- `handler`: responder `429 Too Many Requests` con `{ error: 'rate_limit_exceeded' }`.
- `standardHeaders`: `true` (incluir headers `RateLimit-*`).
- `legacyHeaders`: `false`.

### 3.6 Implementar middleware de errores (`src/api/middlewares/error-handler.ts`)

Capturar cualquier error no manejado:
- `ZodError`: responder `400` con lista de campos invalidos (sin valores internos).
- `ConfigError`: responder `500` con mensaje generico y loguear el error completo.
- Error generico: responder `500 Internal Server Error` sin detalles internos.

En produccion: nunca enviar stack traces al cliente.

### 3.7 Tests de autenticacion y validacion

Crear `src/auth/webhook.auth.test.ts`:

- Acepta peticion valida con Bearer, HMAC y timestamp correctos.
- Rechaza si falta header `Authorization`.
- Rechaza si falta header `X-Deploy-Timestamp`.
- Rechaza si falta header `X-Deploy-Signature`.
- Rechaza si el Bearer es incorrecto.
- Rechaza si el HMAC esta mal calculado.
- Rechaza si el HMAC es correcto pero el body fue modificado.
- Rechaza si el timestamp esta fuera de la ventana (mas viejo que `replay_window_seconds`).
- Rechaza si el timestamp es del futuro (mas alla de la ventana).
- Rechaza si el repo no existe en la config.
- La comparacion de tokens usa tiempo constante (no revela informacion por timing).

Crear `src/api/validators/deploy.validator.test.ts`:

- Acepta payload con `environment`, `workflow`, `ref_name` y `tag` validos.
- Rechaza si `environment` no esta en la config del repo.
- Rechaza si `workflow` no esta en `allowed_workflows`.
- Rechaza si `ref_name` no esta en `allowed_branches`.
- Rechaza si `tag` no cumple `allowed_tag_pattern`.
- Rechaza payload con campos faltantes o tipos incorrectos.

---

## Criterios de aceptacion

- [ ] `POST /deploy` devuelve `202` solo para peticiones con autenticacion y payload completamente validos.
- [ ] Una peticion con Bearer incorrecto devuelve `401`.
- [ ] Una peticion con HMAC incorrecto o body modificado devuelve `401`.
- [ ] Una peticion con timestamp fuera de ventana devuelve `401`.
- [ ] Una peticion con `environment` o `workflow` no permitido devuelve `403`.
- [ ] Una peticion con `tag` que no cumple el patron devuelve `403`.
- [ ] Rate limiting devuelve `429` al exceder el limite.
- [ ] Los logs nunca incluyen valores de secretos.
- [ ] Las respuestas de error no revelan informacion interna.
- [ ] Tests cubren todos los casos de autenticacion y validacion.
