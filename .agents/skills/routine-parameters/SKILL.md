---
name: routine-parameters
description: Trabajar la toma rutinaria de parámetros de Santa Juana y Ficha de Crianza derivada; aplicar horarios, promedios y reglas pendientes sin inventarlas.
---

# Toma de parámetros y Ficha de Crianza

## Fuentes
Leer `docs/modulos/parametros.md`, `docs/modulos/ficha-crianza.md`, `docs/decisiones/0001-separacion-flujos-operacionales.md`, `AGENTS.md` y modelos Prisma `JornadaParametros`, `MuestraParametro`, `MedicionParametro`, `Parametro`.

## Invariantes
- Toma rutinaria exclusivamente para Santa Juana.
- Sistemas: `HATCHERY`, `FRY`, `ONGROWING`, `SMOLT_1`, `SMOLT_2`.
- Horarios programados: `00:00`, `04:00`, `08:00`, `12:00`, `16:00`, `20:00`.
- Una muestra se identifica por sistema y hora dentro de jornada (comprobar restricción existente).
- `MedicionParametro.valor` es decimal; faltantes se excluyen de los promedios, nunca equivalen a cero.
- Ficha de Crianza es resumen semanal por día y sistema, derivado desde PostgreSQL, no una tabla de segunda verdad.

## Decisiones todavía abiertas
- Fórmulas de oxígeno con varios puntos; matriz de parámetros por sistema; estanques activos y configuración; corrección de mediciones históricas; exportación de ficha.
- Documentar pendientes, no definirlos por inferencia del legacy.

## Procedimiento
1. Validar reglas funcionales antes de modificar modelos o cálculos.
2. Inspeccionar comprobaciones de servidor, unicidad, transacciones y representación decimal.
3. Preservar datos y trazabilidad, definir validaciones y pruebas de casos ausentes/parciales.
4. Evitar redondeos ocultos y mezclar valores de incidencia en promedios rutinarios.
