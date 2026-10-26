# AGENTS.md — Control Total v2

## 1. Propósito

Control Total v2 es una aplicación de control y monitoreo operacional de pisciculturas.

Este archivo establece las reglas de trabajo para Codex y otros agentes de desarrollo.

Las instrucciones aquí definidas deben respetarse durante las tareas de análisis, implementación, mantenimiento, pruebas y documentación.

## 2. Stack tecnológico

- Next.js 16 con App Router.
- React 19.
- TypeScript.
- Tailwind CSS v4.
- Prisma 7.
- PostgreSQL 18.
- Supabase Auth con sesiones SSR.
- Node.js 24 LTS.
- npm como gestor de paquetes.

Antes de realizar modificaciones, comprobar las versiones efectivas en `package.json` y el lockfile. No asumir que las versiones indicadas aquí siguen siendo las instaladas.

## 3. Arquitectura

Respetar la estructura existente:

- `src/app/`: rutas, layouts, Server Actions y componentes propios del App Router.
- `src/components/`: componentes reutilizables de interfaz.
- `src/lib/`: lógica de servidor, validaciones, consultas y operaciones de persistencia.
- `prisma/`: esquema, migraciones y datos maestros iniciales.
- `tests/`: pruebas automatizadas.
- `docs/`: documentación funcional, técnica y decisiones arquitectónicas.
- `legacy/`: referencia histórica, no fuente de implementación automática.

Priorizar:

- Separación entre presentación y lógica de negocio.
- Funciones con responsabilidades claras.
- Reutilización razonable de código.
- Tipado estricto.
- Cambios acotados al objetivo del bloque.

Evitar sobreingeniería y refactorizaciones no solicitadas.

## 4. Documentación y fuentes de verdad

Antes de implementar funcionalidades:

1. Leer este archivo.
2. Consultar `docs/README.md`, si existe.
3. Revisar la especificación correspondiente en `docs/modulos/`.
4. Revisar las decisiones vigentes en `docs/decisiones/`.
5. Inspeccionar el código y las pruebas existentes.

El esquema Prisma y las migraciones son la referencia técnica de los modelos y restricciones.

La documentación funcional aprobada define el comportamiento esperado, pero debe contrastarse con el código real.

No convertir suposiciones, prototipos o funcionalidades legacy en requisitos confirmados.

Cuando exista una discrepancia material entre código y documentación, comunicarla antes de introducir cambios incompatibles.

Actualizar la documentación cuando una implementación cambie reglas de negocio o decisiones arquitectónicas.

## 5. Reglas funcionales generales

Control Total contempla dos procesos diferentes:

**Toma rutinaria de parámetros**

- Exclusiva de Santa Juana.
- Registra mediciones por sistema y horario.
- Utiliza jornadas, muestras y mediciones.
- Los promedios y la Ficha de Crianza se derivan de los valores almacenados.

**Eventos y reportes**

- Incluyen todas las pisciculturas, incluida Santa Juana.
- Registran novedades, fallas, alarmas e incidencias.
- Una incidencia puede referenciar un parámetro y registrar un valor sin constituir una medición rutinaria.
- Los eventos pueden abarcar diferentes turnos y ventanas de reporte.

Consultar los documentos funcionales antes de implementar cualquiera de estos procesos.

Los requisitos de Reportes Diarios y Unificados deben revisarse y aprobarse antes de su implementación. No asumir que el sistema legacy define su comportamiento definitivo.

## 6. Autenticación y autorización

- Supabase Auth se utiliza para autenticación.
- PostgreSQL almacena los datos operacionales mediante Prisma.
- No utilizar Supabase Database para sustituir el almacenamiento operacional.
- Toda operación privada debe verificar autorización mediante el mecanismo vigente, actualmente `requireAuthorizedUser()`.
- La protección de un layout no sustituye la autorización en Server Actions o Route Handlers.
- No acceder a Prisma desde Client Components.
- No exponer secretos, credenciales, tokens ni información sensible.
- No modificar el mecanismo de autenticación sin una tarea explícita.

No inventar nuevos roles ni permisos. Utilizar únicamente los mecanismos realmente implementados.

## 7. Prisma y PostgreSQL

- Utilizar el cliente Prisma existente.
- Respetar relaciones, claves foráneas y restricciones.
- Preferir transacciones para operaciones que requieran consistencia entre varias escrituras.
- Validar los datos en el servidor.
- No confiar solamente en comprobaciones de duplicados realizadas antes de una inserción.
- Evitar eliminación física de registros históricos o referenciados cuando el contrato funcional exija conservación.

Prohibido ejecutar sin autorización expresa:

- `prisma migrate reset`.
- `docker compose down -v`.
- Eliminación de tablas o volúmenes.
- Operaciones destructivas sobre datos operacionales.

Crear migraciones versionadas y no destructivas cuando sean necesarias.

No editar migraciones ya aplicadas ni manipular directamente la tabla `_prisma_migrations`.

Comprobar el estado mediante `npm run prisma:migrate:status`.

## 8. Auditoría

Las operaciones administrativas y operacionales que requieran trazabilidad deben utilizar el modelo `Auditoria` y las convenciones existentes.

- Registrar actor, módulo, acción, entidad y snapshots relevantes.
- No registrar secretos.
- Evitar auditorías duplicadas o acciones sin cambios efectivos.
- Cuando el cambio y su auditoría formen una única operación lógica, guardarlos transaccionalmente.
- Conservar el historial de auditoría.

No crear nuevos sistemas paralelos de auditoría sin justificación.

## 9. Interfaz y experiencia de usuario

- Respetar el sistema visual existente.
- Priorizar claridad, legibilidad y facilidad de uso en escritorio.
- Mantener adaptación razonable a pantallas pequeñas.
- Utilizar etiquetas, estados de carga, mensajes de error y confirmaciones cuando correspondan.
- Mantener accesibilidad por teclado.
- Evitar nuevas bibliotecas de UI si los componentes existentes son suficientes.

Los prototipos legacy son referencias funcionales, no plantillas visuales obligatorias.

## 10. Pruebas y calidad

Antes de declarar una tarea terminada, ejecutar según corresponda:

```text
npm run lint
npm run test:auth
npm run test:db
npm run build
npm run prisma:migrate:status
npm audit
```

Comprobar TypeScript cuando el build no sea suficiente o se requiera una verificación independiente.

Agregar pruebas para cambios de lógica, persistencia, validación y autorización.

Las pruebas de base de datos deben preservar los registros existentes, utilizando rollback o aislamiento seguro.

No declarar pruebas exitosas si no pudieron ejecutarse.

Diferenciar claramente entre pruebas automatizadas, pruebas manuales y verificaciones parciales.

## 11. Flujo de trabajo y Git

- Trabajar directamente sobre `main`, salvo indicación contraria.
- Ejecutar `git status --short` antes de modificar archivos.
- Preservar cambios locales existentes.
- No crear ramas sin solicitud.
- No hacer commit ni push automáticamente.
- No modificar archivos ajenos al alcance de la tarea.
- Evitar cambios masivos de formato.
- Revisar `git diff --check` antes de entregar.

Si el entorno no dispone de una herramienta requerida, informar la limitación sin inventar resultados.

## 12. Entrega de tareas

Al terminar una implementación, informar:

1. Funcionalidad completada.
2. Archivos creados y modificados.
3. Decisiones técnicas relevantes.
4. Migraciones, cuando existan.
5. Resultado de las pruebas.
6. Limitaciones y pendientes.
7. Pasos de validación manual.

No considerar completado un bloque únicamente porque su interfaz se renderiza.

## 13. Instrucciones generadas por Next.js

Conservar íntegramente a continuación el bloque administrado por Next.js, incluidos sus marcadores originales. No editar manualmente su contenido.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
