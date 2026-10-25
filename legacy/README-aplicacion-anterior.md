# Notas archivadas de Control Total V1

Este documento conserva decisiones técnicas e instrucciones de distribución de
la versión anterior. Las indicaciones de ejecución siguientes describen el
paquete V1 histórico; no son pasos para iniciar Control Total V2 ni convierten
este directorio en la copia operativa independiente de V1. Las rutas mencionadas
son relativas a `legacy/`, salvo cuando se indique otra base.

Aplicación Vanilla HTML/CSS/JavaScript conectada a Firebase Authentication y
Firestore. El CSS está en `assets/css/app.css` y el JavaScript de la aplicación
en `assets/js/legacy.js`. Este último se carga como script clásico al final de
`index.html`, después de las dependencias CDN, sin `async`, `defer` ni módulos
ES. La copia exacta del documento original está en
`Reporte_Unificado70.html`.

## Distribución histórica en Windows

El paquete anterior se iniciaba con `ReporteControlTotal.exe`. El launcher servía
los archivos locales en `127.0.0.1:5500` y abría esa dirección en el navegador
predeterminado. El paquete distribuido no requería Python, Node, npm ni Go.

El ejecutable se distribuía junto a `index.html` y `assets/`.
Los archivos se buscaban junto al ejecutable, no en el directorio de trabajo.

La ventana del servidor debía permanecer abierta. Si faltaba `index.html` o el
puerto 5500 estaba ocupado, se mostraba un error y la ventana esperaba Enter
antes de cerrarse.

El servidor aceptaba conexiones únicamente en `127.0.0.1`. Las dependencias CDN
y Firebase requerían Internet.

## Compilación histórica en Fedora

Go se necesitaba solamente en desarrollo. Desde `legacy/`:

```bash
cd launcher
GOOS=windows GOARCH=amd64 go build -o ../ReporteControlTotal.exe
```

El ejecutable de Windows amd64 se genera en la raíz. `launcher/go.mod` permite
ejecutar ese comando sin dependencias externas. Distribuye el ejecutable junto
con `index.html` y la carpeta `assets/`, incluyendo las imágenes que utilice
el reporte. No se utiliza `go:embed`: puedes editar los archivos web sin
recompilar el launcher.

Si Go no puede obtener el estado de Git (por ejemplo, en una copia con metadatos
Git inaccesibles), utiliza esta variante desde `launcher/`:

```bash
GOOS=windows GOARCH=amd64 go build -buildvcs=false -o ../ReporteControlTotal.exe
```

La misma opción `-buildvcs=false` puede utilizarse para compilar en Linux.

Para comprobar la compilación y ejecución en Linux, desde `launcher/`:

```bash
go build -o ../ReporteControlTotal
../ReporteControlTotal
```

En Linux, abre manualmente `http://127.0.0.1:5500`. La apertura automática del
navegador está implementada para Windows.

## Hallazgos previos conservados

- El botón «Siguiente Día» llama a `avanzarSiguienteDia`, que no está definida
  en el documento original disponible.
- Se referencia `im/logo1.jpg`, pero ese recurso no está en el proyecto
  disponible. Se conserva la ruta y el comportamiento original al faltar.
- Las exportaciones de imagen actuales generan PNG, aunque se hayan descrito
  como JPG.

Estos hallazgos no se corrigen en este bloque.

## Etapa 2: JavaScript externo

La extracción conserva exactamente el código original, incluidos comentarios,
variables globales, handlers inline y temporizadores. No cambia Firebase ni
las rutas de datos.

Al distribuir o copiar el proyecto, incluye `assets/js/legacy.js`: si falta o
no puede cargarse, la aplicación no se inicializa. El orden de ejecución se
conserva mediante la carga clásica, sincrónica, en la posición del bloque
original. La validación visual y funcional en el navegador sigue siendo
necesaria antes de aprobar la etapa.

## Normalización de incidencias

`eventos_historicos` es la única fuente de incidencias. Los arrays antiguos dentro
de reportes diarios se preservan físicamente, pero la aplicación no los utiliza ni
los escribe. El reporte diario guarda sólo responsables, horas y textos por centro.
`ru-fecha` es la fecha de cierre operacional. La ventana de incidencias va desde
el día anterior con horaInicio hasta la fecha seleccionada con horaFin, usando
fechas locales e intervalos `[inicio, fin)`. `fecha_reporte` se calcula desde el
inicio real del evento y la hora de corte; la visibilidad depende de la
intersección temporal, incluso para incidencias retroactivas. Los guardados
rechazan cierres anteriores o iguales al inicio.

La auditoría no destructiva se documentó
en [scripts/README-incidencias.md](scripts/README-incidencias.md) para identificar
IDs sólo legacy y metadata histórica incompleta. El script no se carga ni se
ejecuta automáticamente. No hay migración de los registros sólo legacy.

Validación local sin acceso a Firebase:

```bash
node legacy/tests/normalizacion-incidencias.test.cjs
node legacy/tests/eliminacion-eventos.test.cjs
node legacy/tests/regresion-modal-incidencias.test.cjs
node legacy/tests/semantica-temporal.test.cjs
```
