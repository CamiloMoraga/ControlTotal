---
name: control-total-quality
description: Ejecutar una revisión de calidad, autorización y pruebas reproducibles en Control Total, respetando .nvmrc, Git y artefactos existentes.
---

# Calidad y verificación Control Total

## Fuentes

Leer `AGENTS.md`, `package.json`, `.nvmrc`, los tests afectados, reglas de auth y auditoría antes de verificar.

## Preparación de entorno

- Antes de **cada** invocación independiente de shell con herramientas Node, seleccionar la versión declarada en `.nvmrc`; no cambiar alias global ni instalar otra versión sin autorización.
- Por ejemplo, en un shell bash: `export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"; nvm use` y verificar `node --version`.
- Registrar `node --version`, `npm --version` y comandos ejecutados. Si el acceso a NVM está restringido, informar el bloqueo y solicitar aprobación puntual.
- Revisar `git status --short --untracked-files=all` antes y después; preservar trabajo ajeno.

## Matriz de revisión

- Autorización en cada Server Action/Route Handler, no solo en layout; revisar `requireAuthorizedUser()` y no inventar roles.
- No exponer Prisma al cliente, secretos ni datos de auth. Revisar límites, entradas, auditabilidad y errores sin detalles sensibles.
- Pruebas focalizadas de lógica, validaciones y persistencia; `npm run test:auth`, `npm run test:db`, `npm run lint`, `npm run build`, `npm run prisma:migrate:status` cuando aplique y esté autorizado.
- Para DB, usar aislamiento/rollback y evitar alterar registros operacionales.
- Cuando sea posible, evitar sobrescribir artefactos preexistentes; explicar cualquier desviación del comando habitual.
- Higiene de temporales: si se crean scripts o directorios auxiliares (`scripts/`, `dist/`, archivos de depuración) durante la verificación, eliminarlos antes de cerrar la tarea o proponer explícitamente su conservación si aportan valor permanente, confirmando limpieza final con `git status --short --untracked-files=all`.

## Informe obligatorio

Tabla de comandos realmente ejecutados, versión, cantidad de pruebas aprobadas/fallidas, advertencias, modificaciones, riesgos y pasos manuales pendientes. No llamar «aprobado» lo que solo se revisó estáticamente.
