# Documentación de Control Total v2

Este índice separa **requisitos confirmados por el proyecto**, **hechos comprobados en el repositorio** y **decisiones pendientes**. El [esquema Prisma](../prisma/schema.prisma) es la fuente técnica de verdad para modelos y relaciones. El [sistema legacy](../legacy/README.md) es una referencia funcional, no una especificación definitiva.

## Arquitectura y decisiones

- [Modelo de datos](arquitectura/modelo-datos.md): relaciones Prisma y diagramas.
- [0001 — Separación de flujos operacionales](decisiones/0001-separacion-flujos-operacionales.md).

## Módulos

- [Toma de Parámetros](modulos/parametros.md).
- [Ficha de Crianza](modulos/ficha-crianza.md).
- [Eventos operacionales](modulos/eventos.md).
- [Reportes](modulos/reportes.md): requisitos sujetos a revisión antes de implementar.

## Planificación y documentación previa

- [Roadmap](planificacion/roadmap.md).
- [Catálogos de Eventos: integridad y despliegue](event-catalogs.md): notas técnicas existentes sobre la migración y las validaciones de catálogos.
