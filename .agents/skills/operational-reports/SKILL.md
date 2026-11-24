---
name: operational-reports
description: Analizar requisitos y diseñar reportes diarios/unificados de Control Total conservando incidencias originales; requiere aprobación funcional antes de implementar.
---

# Reportes diarios y unificados

## Puerta de aprobación
Leer `docs/modulos/reportes.md`, `docs/modulos/eventos.md`, `docs/decisiones/0001-separacion-flujos-operacionales.md`, `AGENTS.md` y modelos Prisma de reportes.
**Los requisitos de Reportes Diarios y Unificados están pendientes de revisión y modificación. No implementar formularios, reglas de corte o flujos del legacy como si estuvieran aprobados.**

## Confirmado
- Aplica a todas las pisciculturas, incluida Santa Juana.
- Incluye novedades, responsables e incidencias.
- Utiliza eventos persistidos en PostgreSQL.
- Un evento original puede figurar en varias ventanas sin duplicar su fila.
- `ReporteDiario`, `ReporteDiarioPiscicultura`, `ReporteUnificado` y `ReporteUnificadoPiscicultura` existen en Prisma; su existencia no aprueba el diseño funcional.

## Antes de codificar
1. Elaborar matriz confirmados / pendientes: ventanas, turnos, responsables, campos, edición, aprobación, presentación y asociación temporal de eventos.
2. Pedir decisiones concretas al responsable antes de convertirlas en esquema o UI.
3. Evaluar selección de eventos por solapamiento temporal, incluyendo abiertos y cruce de turnos, solo después de definir ventanas.
4. Diseñar pruebas para no duplicación, continuidad temporal, autorización y trazabilidad.

## Entrega
Especificación propuesta con decisiones pendientes y criterios de aceptación; implementación solo ante alcance expresamente aprobado.
