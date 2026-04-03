# Task 2.2 — Implementar `depctl status`

## Objetivo

Diagnóstico instantáneo del estado del sistema.

## Detalle

Mostrar:

1. **Servidor**: versión, uptime, URL pública configurada.
2. **Webhook**: ¿contenedor corriendo? ¿responde `/health`?
3. **Redis**: ¿conectado? ¿latencia?
4. **Worker**: ¿corriendo? ¿jobs pendientes/activos?
5. **Docker socket**: ¿accesible?
6. **Repos configurados**: cantidad y nombres.

Formato:

```
depctl status
  Server:   v0.1.0 | up 3d 12h
  URL:      https://deploy.ipepio.com
  Webhook:  ✅ healthy
  Redis:    ✅ connected (1ms)
  Worker:   ✅ running (0 pending)
  Docker:   ✅ socket OK
  Repos:    2 configured
```

Si algo falla, mostrar ❌ con hint accionable.

## Criterios de aceptación

- [ ] Un vistazo rápido dice si todo funciona o qué está roto.
- [ ] Soporta `--json` para scripting.
- [ ] No requiere auth (ejecuta local).
