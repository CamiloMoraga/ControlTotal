# Ficha de Crianza

**Estado:** requisitos funcionales confirmados; generación e interfaz pendientes.

## Requisitos confirmados

- Presenta un resumen **semanal organizado por día**, con resultados separados por sistema.
- Utiliza los promedios diarios de la [toma rutinaria de parámetros](parametros.md).
- Es una vista derivada: **no constituye una segunda fuente de datos**.
- Debe generarse desde PostgreSQL, a partir de los datos operacionales persistidos allí.

El [esquema Prisma](../../prisma/schema.prisma) contiene jornadas, muestras y mediciones, pero no un modelo propio de Ficha de Crianza. La futura ficha dependerá de las reglas de promedio que se definan para la toma de parámetros.

## Decisiones pendientes

- Forma de presentación y generación de la ficha.
- Funciones de exportación y comparación entre semanas: se evaluarán posteriormente.
- Reglas de agregación aún abiertas en [Toma de Parámetros](parametros.md), especialmente oxígeno con múltiples puntos.
