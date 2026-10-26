# Eventos operacionales

**Estado:** requisitos confirmados; registro operacional pendiente. La administración técnica de catálogos ya figura en Configuración.

## Requisitos confirmados

- Los eventos corresponden a **todas las pisciculturas**, incluida Santa Juana. Pueden representar fallas, alarmas y otras incidencias.
- Un evento puede relacionarse con un parámetro como oxígeno o temperatura. Su valor asociado **no se convierte automáticamente en una medición rutinaria**; véase [separación de flujos](../decisiones/0001-separacion-flujos-operacionales.md).
- Los eventos tienen inicio, fin opcional, personal, ocurrencias y clasificaciones. Pueden permanecer abiertos durante más de un turno.
- Cada evento debe conservarse independientemente de las ventanas de los reportes: puede aparecer en más de una sin duplicarse.

## Correspondencia con Prisma

El [esquema](../../prisma/schema.prisma) define `EventoOperacional` con `pisciculturaId`, `inicio`, `fin?`, `personal?`, `ocurrencias`, `tipo?`, referencias opcionales a catálogos, `parametroId?`, `valor?` y `reporteOrigenId?`. `EventoEstanque` relaciona un evento con identificadores de estanque. `fin = null` representa un evento abierto; la migración inicial exige que el fin, si existe, sea posterior al inicio. `reporteOrigenId` es un vínculo opcional a `ReporteUnificado`, no determina la vida del evento ni sus ventanas de aparición. La ruta [`/eventos`](<../../src/app/(app)/eventos/page.tsx>) todavía es un estado vacío.

## Catálogos

`CategoriaEvento`, `CondicionEvento`, `AreaOperacional`, `MotivoEvento` y `SubmotivoEvento` clasifican eventos. `SubmotivoEvento` pertenece a un `MotivoEvento`. El Bloque 4.2 contempla su administración; el código actual ya ofrece operaciones de catálogo en Configuración. Véanse las [notas técnicas existentes](../event-catalogs.md) y el [roadmap](../planificacion/roadmap.md) para distinguir implementación y validación.

**Validación futura:** `EventoOperacional` tiene claves foráneas independientes para `motivoId` y `submotivoId`; estas no garantizan que el submotivo pertenezca al motivo elegido. Al implementar el registro operacional, validar esa correspondencia. El mecanismo de refuerzo en base de datos sigue por decidirse.
