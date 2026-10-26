# Reportes

> **Advertencia:** Los requisitos funcionales de Reportes Diarios y Reportes Unificados están pendientes de revisión y modificación antes de su implementación. No implementar este módulo tomando automáticamente como definitivos los formularios y reglas del sistema legacy.

## Requisitos confirmados

- Los reportes incluyen **todas las pisciculturas**, incluida Santa Juana.
- Contienen novedades, responsables e incidencias.
- Una incidencia puede aparecer en varias ventanas de reporte sin duplicar su registro original.
- Deben utilizar eventos almacenados en PostgreSQL.
- Existe un [prototipo legacy](../../legacy/README.md) como referencia funcional, sujeto a revisión.

## Estado técnico comprobado

El [esquema Prisma](../../prisma/schema.prisma) ya define `ReporteDiario`, `ReporteDiarioPiscicultura`, `ReporteUnificado` y `ReporteUnificadoPiscicultura`; `EventoOperacional` tiene una relación opcional de reporte de origen con `ReporteUnificado`. Esto describe la estructura existente, **no aprueba** los formularios, campos ni reglas operacionales de los nuevos reportes. Las rutas de [reporte diario](<../../src/app/(app)/reportes/diario/page.tsx>) y [reporte unificado](<../../src/app/(app)/reportes/unificado/page.tsx>) muestran estados vacíos.

## Pendiente de revisión

Definir y modificar los requisitos funcionales concretos de ambos tipos de reporte antes de implementar sus interfaces o procesos. La forma precisa de asociar eventos con cada ventana también requiere esa revisión; un reporte no debe crear copias de los eventos para mostrarlos.
