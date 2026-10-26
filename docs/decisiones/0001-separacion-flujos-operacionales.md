# 0001 — Separación de flujos operacionales

- **Fecha:** 2026-10-26.
- **Estado:** aceptada para la separación conceptual; detalles operacionales indicados abajo siguen pendientes.
- **Contexto:** la toma rutinaria y las incidencias pueden mencionar un mismo parámetro, pero tienen propósito, cobertura y ciclo de vida distintos.

## Decisión

1. La **toma rutinaria de parámetros** es exclusiva de Santa Juana y registra jornadas, muestras y mediciones individuales.
2. El **registro de eventos** aplica a todas las pisciculturas y conserva incidencias con inicio y fin opcional, aun cuando abarquen varios turnos.
3. Los **reportes** se generan con eventos almacenados y los datos del período correspondiente. Un evento se consulta en cada ventana pertinente sin duplicar su registro.
4. La **Ficha de Crianza** se deriva de las mediciones rutinarias mediante promedios diarios; no almacena una segunda verdad operacional.

El catálogo `Parametro` puede servir de referencia en `MedicionParametro` y en `EventoOperacional`, pero una medición y un evento siguen siendo entidades operacionales diferentes. Un valor incluido en una incidencia no crea una medición rutinaria.

## Consecuencias arquitectónicas

- Mantener separados los flujos de captura y sus relaciones Prisma: [modelo de datos](../arquitectura/modelo-datos.md).
- Consultar los eventos por intervalo de reporte sin copiar filas originales. El vínculo opcional `reporteOrigenId` del esquema no sustituye esa consulta temporal.
- Derivar Ficha de Crianza desde PostgreSQL y resolver las reglas de promedios antes de implementarla.
- Tratar los [requisitos de Reportes](../modulos/reportes.md) y las reglas abiertas de [Parámetros](../modulos/parametros.md) como pendientes de definición; esta decisión no aprueba sus formularios ni fórmulas.
