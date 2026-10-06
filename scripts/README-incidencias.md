# Normalización de incidencias y auditoría

`eventos_historicos/{id}` es la fuente canónica. La carga del reporte lee solamente
campos diarios de `reportes_unificados/RU_fecha`; los arrays legacy no se usan ni
se escriben ni se eliminan. Se conserva el modal de confirmación de incidencias,
sin destinos de sincronización. `oculto` aplica al documento canónico y por tanto
a todos los reportes que muestran esa incidencia.

`ru-fecha` es la fecha de cierre operacional. La ventana local es
`fecha anterior + horaInicio` → `fecha seleccionada + horaFin`, con inicio incluido
y fin excluido: `[inicio, fin)`. Por ejemplo, el reporte del 06/10/2026 con corte
07:30 abarca 05/10/2026 07:30 → 06/10/2026 07:30. Las horas guardadas del reporte
tienen prioridad; si no hay reporte, se usan las horas actuales de la interfaz.

La intersección para fechas válidas es exactamente:
`eventoInicio < periodoFin && (!eventoFin || eventoFin > periodoInicio)`.
Un evento que termina exactamente al inicio del período queda excluido; uno que
comienza exactamente al cierre pertenece al período siguiente. Un evento abierto
intersecta los períodos posteriores sin duplicarse físicamente.

`fecha_reporte` es metadata: la fecha de cierre correspondiente al inicio real del
evento, calculada con la hora de corte de cierre (`ru-hora-fin`, por defecto 07:30).
Antes del corte corresponde al mismo día; desde el corte inclusive, al día siguiente.
Se calcula al guardar, también al editar, sin sobrescribir `fechaHora` ni
`fechaHoraFin`. La metadata no decide la visibilidad. Una incidencia retroactiva
finalizada se muestra únicamente en los períodos que intersecta; no se traslada al
reporte visible. La selección inicial abre el cierre correspondiente al instante
local actual, sin convertir el calendario a UTC.

## Ejecutar la auditoría antes de distribuir el cambio

Abrir la aplicación e iniciar sesión con permisos de lectura sobre ambas
colecciones. En la consola del navegador ejecutar:

```js
const script = document.createElement('script');
script.src = 'scripts/auditar-incidencias.js';
script.onload = async () => {
    const resultado = await window.auditarConsistenciaIncidencias();
    console.log(resultado);
};
document.head.appendChild(script);
```

El script sólo hace dos lecturas desde el servidor. No crea, actualiza ni borra
documentos. Cuenta IDs únicos y enumera todas las apariciones de IDs sólo legacy
con `rowId`, fecha del reporte y centro. También detecta metadata histórica
incompleta, centros sin resolver y tipos de fecha incompatibles con una futura
consulta limitada por string. No registra personal ni comentarios.

Los IDs sólo legacy no aparecerán en la nueva aplicación. Revisar ese listado
para decidir una migración controlada posterior; esta etapa no los migra ni
recurre a los arrays antiguos para recuperarlos.

## Compatibilidad temporal

Sin una auditoría real que garantice un formato uniforme de `fechaHora`, la carga
canónica lee toda la colección y filtra la superposición en memoria. No requiere
índices compuestos y no pierde documentos con campo de inicio ausente o con
Timestamp. Tiene un costo de lectura proporcional a toda la colección por carga.
No se optimiza aún con `where('fechaHora', '<=', ...)`: ese límite sobre strings
puede omitir documentos sin el campo o de otro tipo.

Fechas ausentes/inválidas se tratan conservadoramente como límites desconocidos.
Un fin válido menor o igual al inicio del período o un inicio válido mayor o igual
al cierre excluyen el evento; los límites desconocidos no lo excluyen y generan
una advertencia con su ID. Es una excepción conservadora para datos antiguos, no
una regla para nuevos guardados. Duraciones cero o negativas con límites válidos
se excluyen de la carga con advertencia; los documentos no se modifican. Los
Timestamp/Date se convierten a texto local sólo en memoria para compatibilidad con
los componentes visuales. El ID canónico es el ID del documento, aunque falte el
campo `id`. Se agrupa por `id_centro`; `nombre_centro` sólo es fallback para centros
configurados. Un centro no resoluble se registra para revisión y no puede mostrarse
en la grilla existente. Ninguna de estas lecturas repara automáticamente documentos.

Las lecturas canónicas exigen conexión al servidor. Si fallan, se avisa y no se
recurre a datos legacy. Una edición de un documento eliminado falla mediante
`update`, sin recrearlo. La creación/edición conserva las fechas reales introducidas
y el centro existente, y calcula la metadata operacional desde el inicio. No hay
recalculado masivo de metadata histórica. Guardar exige un inicio válido y un fin
vacío o estrictamente posterior al inicio: se rechazan fechas inválidas, fin
anterior e igualdad con un mensaje explícito antes de escribir. Se decidió no
admitir eventos instantáneos porque su intervalo `[inicio, fin)` sería vacío.
Memoria, visibilidad y tarjeta se actualizan después de confirmar la escritura.

## Validación

```bash
node tests/normalizacion-incidencias.test.cjs
node tests/eliminacion-eventos.test.cjs
node tests/regresion-modal-incidencias.test.cjs
node tests/semantica-temporal.test.cjs
```

Las pruebas utilizan dobles de Firebase/DOM y no conectan a producción. La auditoría
real y la validación visual autenticada requieren una sesión con acceso a Firebase.
En el entorno de desarrollo utilizado para este cambio no se pudo resolver
`firestore.googleapis.com`; no hay conteos reales ni una lista real de IDs sólo legacy
verificados en ese entorno.
