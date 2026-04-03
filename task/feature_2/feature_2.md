# Feature 2 — Inicialización y estado de instancia

## Objetivo

Ofrecer `depctl init` para configurar una instancia recién instalada y `depctl status` para diagnóstico rápido.

## Contexto

Tras instalar, el operador necesita configurar la URL pública del servidor (para que los secrets y workflows generados apunten al sitio correcto) y poder verificar que todo funciona.

## Resultado esperado

- `depctl init` configura URL pública, puerto y paths
- `depctl status` muestra salud de todos los componentes
- Errores accionables (no mensajes crípticos)

## Fuera de alcance

- Configuración avanzada de rate limiting o notificaciones (se hace editando YAML)
