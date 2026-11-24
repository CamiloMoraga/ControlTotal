---
name: control-total-context
description: Entender la arquitectura, decisiones y alcance de Control Total v2 antes de proponer cambios; usar al iniciar una tarea transversal o ante requisitos ambiguos.
---

# Contexto de Control Total v2

## Antes de actuar
1. Leer `AGENTS.md`, `docs/README.md` y `docs/planificacion/roadmap.md`.
2. Consultar `docs/decisiones/0001-separacion-flujos-operacionales.md` y el documento `docs/modulos/` de la tarea.
3. Inspeccionar código, esquema Prisma y pruebas; distinguir documentación confirmada de implementación efectiva.
4. Identificar explícitamente requisitos confirmados, pendientes de decisión y supuestos.

## Límites del dominio
- Toma rutinaria de parámetros: exclusiva de Santa Juana, con jornadas, muestras y mediciones.
- Eventos: todas las pisciculturas, incidencias con inicio y fin opcional, independientes de las ventanas de reporte.
- Reportes: consultan eventos persistidos y no duplican el registro original.
- Ficha de Crianza: vista derivada desde promedios, sin segunda fuente de datos.
- El catálogo `Parametro` compartido no convierte `EventoOperacional` en `MedicionParametro`.

## Arquitectura y trabajo
- Respetar Next.js App Router y separación `src/app`, `src/components`, `src/lib`, `prisma`, `tests`, `docs`.
- No convertir prototipos `legacy/` en requisitos aprobados.
- No introducir refactor transversal o nuevos patrones sin demostrar necesidad y costes.
- Contrastar cambios con decisiones, documentación y pruebas. Documentar divergencias antes de alterar contratos.

## Entregable
Emitir: hallazgos con rutas, alcance confirmado, decisiones pendientes, propuesta mínima, riesgo de regresión y plan de validación. No afirmar que una revisión estática equivale a prueba ejecutada.
