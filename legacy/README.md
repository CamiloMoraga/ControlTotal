# Referencia histórica de Control Total V1

Los archivos contenidos en este directorio corresponden al sistema anterior
de Control Total desarrollado principalmente con HTML, CSS, JavaScript,
Firebase Authentication y Firestore.

Se conservan exclusivamente como referencia funcional y técnica durante
la construcción de Control Total V2. La aplicación V1 operativa existe de forma
independiente; este directorio no es parte de la aplicación Next.js ni un entorno
de producción de V1.

- `Reporte_Unificado70.html`: documento original de referencia.
- `index.html` y `assets/`: instantánea posterior de la interfaz y sus recursos.
- `launcher/`: código fuente del iniciador local que acompañaba a V1.
- `scripts/` y `tests/`: auditoría y pruebas históricas de incidencias.
- `README-aplicacion-anterior.md`: notas técnicas y de distribución archivadas.
- `INVENTARIO-LIMPIEZA.md`: clasificación y destino de cada recurso auditado.

Las credenciales y configuraciones de acceso originales fueron eliminadas
deliberadamente.

Estos archivos no deben utilizarse como aplicación productiva.

Control Total v2 utilizará:

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Supabase Auth
- Vercel

No existe migración de los datos históricos Firebase hacia PostgreSQL.
La nueva base comenzará desde cero a partir de la fecha de puesta en marcha
del nuevo sistema.
