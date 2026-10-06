# Reporte Control Total

Aplicación Vanilla HTML/CSS/JavaScript conectada a Firebase Authentication y
Firestore. El CSS está en `assets/css/app.css` y el JavaScript de la aplicación
en `assets/js/legacy.js`. Este último se carga como script clásico al final de
`index.html`, después de las dependencias CDN, sin `async`, `defer` ni módulos
ES. La copia exacta del documento original está en
`legacy/Reporte_Unificado70.html`.

## Ejecutar en Windows

Haz doble clic sobre `ReporteControlTotal.exe`. El launcher inicia el servidor
local en `127.0.0.1:5500` y abre `http://127.0.0.1:5500` en el navegador
predeterminado. No necesitas instalar Python, Node, npm ni Go, ni escribir
comandos.

Mantén el ejecutable en la raíz del proyecto, junto a `index.html` y `assets/`.
Puedes abrirlo mediante un acceso directo con otro directorio de trabajo:
los archivos se buscan junto al ejecutable, no en el directorio de trabajo.

Mantén abierta la ventana del servidor mientras utilizas el reporte. Para
detenerlo, cierra esa ventana o presiona `Ctrl+C`. Si falta `index.html` o el
puerto 5500 está ocupado, se muestra un error y la ventana espera Enter antes
de cerrarse. Si falla la apertura automática del navegador, puedes abrir la
dirección indicada manualmente.

El servidor acepta conexiones únicamente en `127.0.0.1`. No requiere permisos
de administrador ni cambios en el firewall. Las dependencias CDN y Firebase
siguen utilizando Internet como en la aplicación original.

## Compilar en Fedora

Go se necesita solamente en desarrollo. Desde la raíz del proyecto:

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

Antes de distribuir esta versión, ejecutar la auditoría no destructiva documentada
en [scripts/README-incidencias.md](scripts/README-incidencias.md) para identificar
IDs sólo legacy y metadata histórica incompleta. El script no se carga ni se
ejecuta automáticamente. No hay migración de los registros sólo legacy.

Validación local sin acceso a Firebase:

```bash
node tests/normalizacion-incidencias.test.cjs
node tests/eliminacion-eventos.test.cjs
node tests/regresion-modal-incidencias.test.cjs
node tests/semantica-temporal.test.cjs
```
