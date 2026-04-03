# Task 7.3 — Validación cruzada y output del workflow

## Objetivo

Validar que el workflow generado es coherente con la config y ofrecerlo al operador.

## Detalle

1. Validar que el workflow name está en `allowed_workflows`.
2. Validar que los triggers (tags/branches) encajan con `allowed_branches` y `allowed_tag_pattern`.
3. Mostrar el YAML en stdout.
4. Mostrar checklist de secrets a configurar en GitHub.
5. `--write` lo escribe directamente en `.github/workflows/` si está en un repo git.
6. `--output <path>` lo escribe en un path arbitrario.

## Criterios de aceptación

- [ ] Errores de consistencia se detectan antes de generar.
- [ ] El operador puede copiar el output directamente.
- [ ] `--write` solo funciona dentro de un directorio git.
