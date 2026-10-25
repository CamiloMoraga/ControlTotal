# Inventario de limpieza V1 / V2

Auditoría del árbol local realizada antes de la limpieza. Git no mostraba cambios
versionados ni archivos nuevos sin ignorar. Los ejecutables locales de V1 ya
existían, estaban ignorados y se trasladaron sin alterar su contenido.

| Clase | Ruta exacta actual | Motivo y acción |
| --- | --- | --- |
| A | [package.json](../package.json), [tsconfig.json](../tsconfig.json), [eslint.config.mjs](../eslint.config.mjs) | Configuran Next.js, TypeScript, lint y las pruebas V2; conservar. ESLint dejó de ignorar rutas V1 ya trasladadas. |
| A | [prisma/seed.sql](../prisma/seed.sql) | Datos maestros de V2; conservar. Sólo se corrigió un comentario sobre la ubicación del código histórico. |
| A | [src/](../src/) | Rutas, componentes y lógica V2; conservar íntegra. No importa HTML, CSS ni JavaScript de V1. |
| A | [tests/auth/auditoria.test.cjs](../tests/auth/auditoria.test.cjs), [tests/auth/auth.test.cjs](../tests/auth/auth.test.cjs), [tests/auth/load-module.cjs](../tests/auth/load-module.cjs) | Pruebas y helper de autorización y Auditoría V2; conservar. |
| A | [tests/auth/parametro-actions.test.cjs](../tests/auth/parametro-actions.test.cjs), [tests/auth/parametro-validation.test.cjs](../tests/auth/parametro-validation.test.cjs) | Pruebas de Parámetros V2; conservar. |
| A | [tests/auth/piscicultura-actions.test.cjs](../tests/auth/piscicultura-actions.test.cjs), [tests/auth/piscicultura-validation.test.cjs](../tests/auth/piscicultura-validation.test.cjs) | Pruebas de Configuración V2; conservar. |
| A | [tests/db/auditoria.test.ts](../tests/db/auditoria.test.ts), [tests/db/helpers.ts](../tests/db/helpers.ts), [tests/db/integration.test.ts](../tests/db/integration.test.ts) | Pruebas relacionales y helper V2; conservar. |
| A | [tests/db/parametros.test.ts](../tests/db/parametros.test.ts), [tests/db/pisciculturas.test.ts](../tests/db/pisciculturas.test.ts), [tests/db/window.mjs](../tests/db/window.mjs), [tests/db/window.test.mjs](../tests/db/window.test.mjs) | Pruebas de Parámetros, Configuración y ventanas V2; conservar. |
| B | [legacy/index.html](index.html) | Interfaz V1 posterior al documento original; trasladado desde la raíz como referencia funcional. |
| B | [legacy/Reporte_Unificado70.html](Reporte_Unificado70.html) | Documento V1 original; ya estaba aquí y se conservó. |
| B | [legacy/assets/css/app.css](assets/css/app.css), [legacy/assets/css/dashboard.css](assets/css/dashboard.css) | Estilos exclusivos de V1; trasladados con su HTML. |
| B | [legacy/assets/js/legacy.js](assets/js/legacy.js), [legacy/assets/js/dashboard.js](assets/js/dashboard.js) | Implementación V1 y dashboard histórico; trasladados. Las pruebas históricas los leen. |
| B | [legacy/launcher/go.mod](launcher/go.mod), [legacy/launcher/main.go](launcher/main.go) | Fuente del iniciador V1; trasladada como referencia técnica. |
| B | [legacy/scripts/README-incidencias.md](scripts/README-incidencias.md), [legacy/scripts/auditar-incidencias.js](scripts/auditar-incidencias.js) | Procedimiento y script de auditoría Firebase V1; trasladados. Las pruebas históricas leen el script. |
| B | [legacy/tests/eliminacion-eventos.test.cjs](tests/eliminacion-eventos.test.cjs), [legacy/tests/normalizacion-incidencias.test.cjs](tests/normalizacion-incidencias.test.cjs), [legacy/tests/regresion-modal-incidencias.test.cjs](tests/regresion-modal-incidencias.test.cjs), [legacy/tests/semantica-temporal.test.cjs](tests/semantica-temporal.test.cjs), [legacy/tests/helpers/incidencias.cjs](tests/helpers/incidencias.cjs) | Pruebas V1 y su helper; trasladados juntos para mantener sus rutas relativas. Ningún script npm V2 los ejecuta. |
| B | [legacy/README.md](README.md), [legacy/README-aplicacion-anterior.md](README-aplicacion-anterior.md) | Contexto y decisiones históricas; conservados y aclarados para distinguir V1 de V2. |
| B | [legacy/ReporteControlTotal](ReporteControlTotal), [legacy/ReporteControlTotal.exe](ReporteControlTotal.exe) | Ejecutables V1 locales preexistentes; trasladados sin modificarlos y aún ignorados por Git. |
| C | `Reporte_Unificado70.html` (antigua raíz) | Duplicado byte por byte del documento ya conservado en `legacy/`; eliminado. |

No quedaron archivos de clase D: las rutas y dependencias inspeccionadas permiten
identificar los recursos V1. Se conservaron todos los elementos con valor histórico.
Los directorios [tests/auth/](../tests/auth/) y [tests/db/](../tests/db/) siguen
siendo exclusivos de V2. `package.json` ejecuta sólo esas pruebas; `tsconfig.json`
incluye código de `src/`; ESLint ignora `legacy/`. La única mención de un recurso
V1 fuera de documentación y `legacy/` es un comentario en `prisma/seed.sql`.
