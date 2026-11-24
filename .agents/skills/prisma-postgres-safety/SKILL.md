---
name: prisma-postgres-safety
description: Revisar cambios de Prisma 7 y PostgreSQL 18 en Control Total: integridad, migraciones, transacciones, índices y operaciones seguras.
---

# Prisma y PostgreSQL seguros

## Contexto

Leer `AGENTS.md`, `prisma/schema.prisma`, `prisma/migrations/`, `prisma.config.ts`, `docs/arquitectura/modelo-datos.md` y documentación del módulo afectado.

## Protocolo

1. Detectar y preservar cambios locales con `git status --short`; no tocar migraciones ya aplicadas.
2. Respetar la configuración vigente de Prisma 7 (`@prisma/adapter-pg`, generador `prisma-client` con salida en `src/generated/prisma` y `prisma.config.ts`); no introducir imports ni patrones heredados de Prisma 6.
3. Identificar invariantes, relaciones, FK, CHECK, UNIQUE, índices parciales y dependencias de datos; no confiar en una validación solo de cliente.
4. Proponer migración aditiva/versionada y plan de rollback cuando sea posible; distinguir migración local de despliegue.
5. Para varias escrituras relacionadas, usar transacciones; manejar colisiones y concurrencia en DB, no solo consulta previa.
6. Evaluar auditoría transaccional y retención histórica; no borrar datos vinculados sin contrato aprobado.
7. Verificar comandos disponibles (`npm run prisma:migrate:status`, pruebas DB), usando la versión `.nvmrc` por cada invocación; reportar comandos y resultados exactos.

## Prohibiciones sin autorización explícita

No ejecutar `prisma migrate reset`, `docker compose down -v`, SQL destructivo, operaciones sobre producción, manipulación de `_prisma_migrations` ni edición de migraciones ya aplicadas.

## Precaución

La validación de pertenencia de `SubmotivoEvento` a `MotivoEvento` no queda garantizada por dos FK independientes; diseñar defensa en servicio y evaluar refuerzo transaccional/DB cuando se apruebe.
