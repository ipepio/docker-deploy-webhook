# Task 1.3 — Descargar artefactos del proyecto

## Objetivo

Traer al servidor los ficheros necesarios para levantar el servicio.

## Detalle

1. Descargar desde GitHub (release o raw de `main`):
   - `docker-compose.yml`
   - `Dockerfile`
   - `.env.example`
   - `config/server.example.yml`
2. Colocarlos en `/opt/depctl/`.
3. Copiar `.env.example` a `.env` solo si `.env` no existe.
4. Copiar `server.example.yml` a `config/server.yml` solo si no existe.
5. Si los ficheros ya existen, no sobreescribirlos (respetar config del operador).

## Criterios de aceptación

- [ ] Primera ejecución deja todos los ficheros en su sitio.
- [ ] Segunda ejecución no sobreescribe `.env` ni `server.yml` del operador.
- [ ] Si la descarga falla, mensaje claro y salida con código 1.
