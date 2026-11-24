---
name: operational-events
description: Diseñar o revisar Eventos Operacionales, incidencias, estanques, motivo/submotivo y catálogos en Control Total; no usar para toma rutinaria.
---

# Eventos operacionales

## Fuentes
Leer `AGENTS.md`, `docs/modulos/eventos.md`, `docs/event-catalogs.md`, `docs/decisiones/0001-separacion-flujos-operacionales.md` y modelos `EventoOperacional`, `EventoEstanque`, `MotivoEvento`, `SubmotivoEvento` en `prisma/schema.prisma`.

## Reglas de dominio
- Eventos aplican a todas las pisciculturas, incluida Santa Juana.
- Un evento tiene inicio, fin opcional, personal, ocurrencias y clasificaciones; puede atravesar turnos.
- `fin = null` es evento abierto; si existe fin, debe ser posterior a inicio.
- Un evento puede asociar `parametroId` y `valor` textual; eso NO constituye una medición rutinaria.
- Un evento puede tener múltiples estanques; preservar unicidad de estanque por evento según modelo.
- `SubmotivoEvento` pertenece a un motivo: validar que `submotivoId` corresponde al `motivoId` elegido; las FK independientes no garantizan esa relación.
- El vínculo opcional `reporteOrigenId` no determina la vida ni las ventanas del evento.

## Procedimiento
1. Confirmar requisitos y campos abiertos antes de implementar; no inventar comentarios libres ni reglas del legacy.
2. Revisar validaciones en servidor, autorización, condiciones de carrera e integridad en DB.
3. Diseñar cambios mínimos en datos, servicios, UI y pruebas; auditar mutaciones pertinentes.
4. Verificar creación, edición, evento abierto/cerrado, motivo-submotivo, estanques duplicados y consultas por intervalo.

## No hacer
No duplicar eventos por reporte o turno. No inferir funcionalidad terminada porque los catálogos de Configuración ya están implementados.
