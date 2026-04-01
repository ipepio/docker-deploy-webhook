# Task 7 - Notificaciones

## Objetivo

Implementar el sistema opcional de notificaciones que avisa del resultado de cada despliegue por Telegram y/o email (Resend). Si ningun canal esta configurado, el sistema sigue funcionando sin errores. Las notificaciones son fire-and-forget y no deben bloquear ni alterar el estado del job.

---

## Dependencias previas

- Task 1: dependencias `axios` y `resend` instaladas.
- Task 2: config de notificaciones cargada y disponible.
- Task 4: el worker llama a `sendNotification(job, result)` al terminar cada job.
- Task 5: `DeployResult` disponible con `status`, `error`, `rollbackTag`, `logs`.

---

## Quehaceres

### 7.1 Definir tipos de notificacion (`src/notifications/types.ts`)

```typescript
interface NotificationContext {
  serverId: string;
  jobId: string;
  repository: string;
  environment: string;
  tag: string;
  status: DeployResult['status'];
  durationMs: number;
  error?: string;
  rollbackTag?: string;
  triggeredBy: 'webhook' | 'admin';
}

interface NotificationTargets {
  telegram: {
    enabled: boolean;
    botToken?: string;
    chatIds: string[];
  };
  email: {
    enabled: boolean;
    apiKey?: string;
    from?: string;
    recipients: string[];
  };
}
```

### 7.2 Resolver destinatarios para un job (`src/notifications/notifier.ts`)

**Funcion: `resolveTargets(repository: string, environment: string): NotificationTargets`**

Algoritmo de resolucion (los overrides del repo/env REEMPLAZAN, no hacen merge):

```typescript
const serverConfig = getConfig().server.notifications;
const envConfig = getRepoConfig(repository)?.environments[environment]?.notifications;

// Telegram
const baseTelegram = {
  enabled: serverConfig.telegram.enabled,
  botToken: serverConfig.telegram.botToken,
  chatIds: serverConfig.telegram.chatIds,
};
const telegram = envConfig?.telegram?.chatIds
  ? { ...baseTelegram, chatIds: envConfig.telegram.chatIds }
  : baseTelegram;

// Email
const baseEmail = {
  enabled: serverConfig.email.enabled,
  apiKey: serverConfig.email.apiKey,
  from: serverConfig.email.from,
  recipients: serverConfig.email.recipients,
};
const email = envConfig?.email?.recipients
  ? { ...baseEmail, recipients: envConfig.email.recipients }
  : baseEmail;

return { telegram, email };
```

### 7.3 Construir mensajes de notificacion (`src/notifications/messages.ts`)

**Funcion: `buildMessage(ctx: NotificationContext): { subject: string; body: string; telegramText: string }`**

El mensaje debe ser claro y suficiente para diagnosticar sin abrir logs:

Para **Telegram** (Markdown):
```
*[SUCCESS] acme/clash-hub-api*
Entorno: `production`
Tag: `sha-abc1234`
Servidor: `prod-app-1`
Duración: 45s
Job ID: `550e8400-...`
Trigger: webhook
```

Para un estado `rolled_back`:
```
*[ROLLED BACK] acme/clash-hub-api*
Entorno: `production`
Tag fallido: `sha-abc1234`
Tag restaurado: `sha-xyz9876`
Servidor: `prod-app-1`
Error: healthcheck failed after 60000ms
Job ID: `550e8400-...`
```

Para un estado `failed` o `rollback_failed`:
```
*[FAILED] acme/clash-hub-api*
Entorno: `production`
Tag: `sha-abc1234`
Servidor: `prod-app-1`
Error: docker compose up exited with code 1
Job ID: `550e8400-...`
```

Para **email** usar el mismo contenido pero en HTML minimo y con subject descriptivo:
- `[SUCCESS] acme/clash-hub-api @ production`
- `[FAILED] acme/clash-hub-api @ production`
- `[ROLLED BACK] acme/clash-hub-api @ production`
- `[ROLLBACK FAILED] acme/clash-hub-api @ production`

### 7.4 Implementar notificacion Telegram (`src/notifications/telegram.ts`)

**Funcion: `sendTelegramNotification(botToken: string, chatIds: string[], text: string): Promise<void>`**

```typescript
for (const chatId of chatIds) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      },
      { timeout: 10000 },
    );
  } catch (err) {
    logger.warn('Telegram notification failed', { chatId, err: String(err) });
    // No relanzar: las notificaciones son best-effort
  }
}
```

Nunca lanzar excepciones hacia arriba. Si falla un chat_id, continuar con el siguiente.

### 7.5 Implementar notificacion email via Resend (`src/notifications/email.ts`)

**Funcion: `sendEmailNotification(apiKey: string, from: string, recipients: string[], subject: string, html: string): Promise<void>`**

```typescript
import { Resend } from 'resend';

export async function sendEmailNotification(...): Promise<void> {
  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
    });
  } catch (err) {
    logger.warn('Email notification failed', { recipients, err: String(err) });
    // No relanzar
  }
}
```

### 7.6 Implementar el orquestador de notificaciones (`src/notifications/notifier.ts`)

**Funcion principal: `sendNotification(job: DeployJob, result: DeployResult): Promise<void>`**

```typescript
export async function sendNotification(job: DeployJob, result: DeployResult): Promise<void> {
  const targets = resolveTargets(job.payload.repository, job.payload.environment);

  const ctx: NotificationContext = {
    serverId: getConfig().server.id,
    jobId: job.id,
    repository: job.payload.repository,
    environment: job.payload.environment,
    tag: job.payload.tag,
    status: result.status,
    durationMs: result.durationMs ?? 0,
    error: result.error,
    rollbackTag: result.rollbackTag,
    triggeredBy: job.payload.triggeredBy,
  };

  const { subject, body: html, telegramText } = buildMessage(ctx);

  const promises: Promise<void>[] = [];

  if (targets.telegram.enabled && targets.telegram.botToken && targets.telegram.chatIds.length > 0) {
    promises.push(sendTelegramNotification(targets.telegram.botToken, targets.telegram.chatIds, telegramText));
  }

  if (targets.email.enabled && targets.email.apiKey && targets.email.recipients.length > 0) {
    promises.push(sendEmailNotification(targets.email.apiKey, targets.email.from!, targets.email.recipients, subject, html));
  }

  if (promises.length === 0) return;  // nada configurado, salir silenciosamente

  // Ejecutar en paralelo con timeout global
  await Promise.race([
    Promise.allSettled(promises),
    sleep(15000).then(() => logger.warn('Notification timeout exceeded')),
  ]);
}
```

El `Promise.race` con timeout asegura que las notificaciones nunca bloquen el worker mas de 15 segundos.

### 7.7 Iconos de estado para mayor legibilidad

Para diferenciar visualmente en Telegram y email:

```typescript
const STATUS_ICONS: Record<string, string> = {
  success: 'SUCCESS',
  failed: 'FAILED',
  rolled_back: 'ROLLED BACK',
  rollback_failed: 'ROLLBACK FAILED',
};
```

### 7.8 Tests de notificaciones

Crear `src/notifications/notifier.test.ts`:

**Resolucion de targets:**
- Si no hay notificaciones en server config: `enabled=false` en todos los canales.
- Si el repo tiene override de `chat_ids`: se usan los del repo, no los del servidor.
- Si el repo no tiene override: se usan los del servidor.
- El override de email reemplaza, no hace merge.

**Mensajes:**
- Estado `success` genera asunto `[SUCCESS] ...` y body con tag, entorno y duracion.
- Estado `failed` genera asunto `[FAILED] ...` y body con error.
- Estado `rolled_back` incluye `rollbackTag` en el mensaje.
- Estado `rollback_failed` incluye ambos errores en el mensaje.

**Comportamiento:**
- Si Telegram no esta enabled: no se llama al cliente Telegram.
- Si email no esta enabled: no se llama a Resend.
- Si Telegram falla (mock): la funcion no lanza, continua con email.
- Si ambos canales estan vacios: `sendNotification` retorna sin hacer nada.
- Timeout de 15 segundos: si las notificaciones tardan mas, el worker continua.

---

## Criterios de aceptacion

- [ ] Si no hay ningun canal configurado, el bloque de notificaciones es un no-op sin errores.
- [ ] Si Telegram esta configurado, se llama correctamente a la API del bot para cada `chat_id`.
- [ ] Si email esta configurado, se llama correctamente a Resend.
- [ ] Un fallo en Telegram no impide enviar el email y viceversa.
- [ ] Los mensajes incluyen: estado, repo, entorno, tag, servidor, duracion y error si aplica.
- [ ] El timeout de 15 segundos garantiza que las notificaciones no bloquean el worker.
- [ ] Los overrides por repo/environment reemplazan los destinatarios del servidor.
- [ ] Tests cubren resolucion de targets, construccion de mensajes y comportamiento ante fallos.
