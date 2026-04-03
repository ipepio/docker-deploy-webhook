# Task 1.4 — Generar tokens admin iniciales

## Objetivo

Generar de forma segura los tokens de administración del servidor si no existen.

## Detalle

1. Leer `.env` actual.
2. Si `DEPLOY_ADMIN_READ_TOKEN` o `DEPLOY_ADMIN_WRITE_TOKEN` ya tienen valor, no tocarlos.
3. Si están vacíos o no existen:
   - Generar dos tokens aleatorios de 48 caracteres hex (`openssl rand -hex 24`).
   - Escribirlos en `.env`.
4. Mostrar los tokens generados en la salida del script (una sola vez).

## Criterios de aceptación

- [ ] Tokens generados son criptográficamente seguros (CSPRNG).
- [ ] No se sobreescriben tokens existentes.
- [ ] Los tokens aparecen en stdout para que el operador los copie.
