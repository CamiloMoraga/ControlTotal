# Toma de Parámetros

**Estado:** requisito funcional confirmado; interfaz operacional pendiente. La [administración del catálogo de parámetros](../../README.md) ya existe en Configuración, pero no equivale a la toma rutinaria.

## Requisitos confirmados

- La toma rutinaria corresponde **exclusivamente a Santa Juana**. Los sistemas son `HATCHERY`, `FRY`, `ONGROWING`, `SMOLT_1` y `SMOLT_2`.
- Los horarios programados son `00:00`, `04:00`, `08:00`, `12:00`, `16:00` y `20:00`.
- Cada toma registra muestras y mediciones individuales. Los parámetros y puntos de medición varían según el sistema; todavía no hay una matriz aprobada que defina cada combinación.
- La operación debe considerar estanques activos y su configuración. La selección concreta de estanques y la estructura de esa configuración siguen pendientes.
- Se calculan promedios diarios a partir de los valores disponibles. Un valor ausente se excluye del cálculo y **no se convierte en cero**. Por ejemplo, una muestra sin medición de oxígeno no aporta un `0` al promedio.

## Correspondencia con Prisma

Según el [esquema actual](../../prisma/schema.prisma), `JornadaParametros` representa una fecha y piscicultura, con `responsable` y un campo JSON opcional `configuracion` descrito como snapshot sin mediciones. `MuestraParametro` pertenece a la jornada y distingue `sistema` y `hora`; el esquema exige unicidad de esa combinación por jornada. `MedicionParametro` pertenece a la muestra y guarda `parametroId`, `punto` y un `valor` decimal obligatorio. `Parametro` es el catálogo referenciado por cada medición. El esquema no restringe por sí solo las jornadas a Santa Juana ni las horas a las seis programadas; son reglas funcionales para la futura operación.

El campo `punto` permite identificar puntos o estanques sin imponer aquí nombres concretos. Hoy no existe un modelo Prisma específico de estanques activos ni uno de promedios diarios o Ficha de Crianza. La ruta operacional [`/parametros`](<../../src/app/(app)/parametros/page.tsx>) es un estado vacío.

## Pendiente de definición

- Fórmulas detalladas de promedios de oxígeno cuando hay varios puntos de medición.
- Selección de estanques activos y forma de mantener su configuración.
- Posibles reglas de corrección de datos ya registrados.

No deducir estas reglas de la interfaz legacy ni implementarlas antes de confirmarlas.
