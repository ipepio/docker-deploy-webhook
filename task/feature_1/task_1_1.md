# Task 1.1 — Detectar prerequisitos del host

## Objetivo

El script debe verificar que el host tiene todo lo necesario antes de hacer cambios.

## Detalle

1. Verificar que se ejecuta como `root` (o con `sudo`).
2. Detectar distro (`/etc/os-release`) y mostrarla.
3. Comprobar que `docker` está instalado y el daemon está corriendo.
4. Comprobar que `docker compose` (v2 plugin) está disponible.
5. Comprobar que `curl` y `jq` existen.
6. Si falta algún prerequisito:
   - Mostrar mensaje claro de qué falta y cómo instalarlo.
   - Salir con código 1 sin hacer cambios.

## Criterios de aceptación

- [ ] Script sale limpio si faltan prerequisitos, sin tocar nada del sistema.
- [ ] Mensaje de error incluye el comando exacto para instalar lo que falta.
- [ ] Compatible con Ubuntu 22/24 y Debian 12.
