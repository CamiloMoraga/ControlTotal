# Control Total

Nueva aplicación operacional para Control y Monitoreo de pisciculturas.

**Estado:** Control Total v2 en desarrollo. Los módulos disponen de navegación y
estados vacíos; sus funcionalidades operacionales aún no están implementadas.

## Stack actual

- Next.js con App Router
- TypeScript
- Tailwind CSS
- PostgreSQL 18 local con Docker Compose
- Prisma 7 (configuración inicial, sin modelos ni consultas)

## Stack planificado

- Supabase (PostgreSQL alojado)
- Supabase Auth
- Vercel

## Desarrollo local

Usar Node.js 24 LTS (indicado en `.nvmrc`) y npm. Con nvm disponible:

```bash
nvm use
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).
La UI todavía inicia sin consultar la base de datos.

## PostgreSQL local

Control Total utiliza PostgreSQL 18 en Docker durante desarrollo. Se requiere
Docker con Docker Compose. Crear `.env` a partir de `.env.example` si no existe y
configurar `POSTGRES_PASSWORD` con una contraseña exclusiva de desarrollo.
Configurar `DATABASE_URL` y `DIRECT_URL` con la misma conexión:
`postgresql://controltotal:<contraseña-local>@localhost:5434/controltotal_dev?schema=public`.
Si la contraseña contiene caracteres reservados de URL, codificarlos en ambas URL.
Las credenciales locales se guardan únicamente en `.env`, que no se versiona.
Las variables de Supabase y `CONTROL_USER_EMAIL` permanecen vacías en esta etapa.

```bash
npm run db:up
npm run db:ps
npm run db:logs
npm run db:down
```

Datos de conexión para la extensión PostgreSQL de VS Code:

- Host: `localhost`
- Puerto: `5434`
- Base: `controltotal_dev`
- Usuario: `controltotal`
- SSL: deshabilitado (local)
- Contraseña: consultar `.env`

El contenedor `controltotal-postgres` utiliza el volumen persistente exclusivo
`controltotal_postgres_data`, montado en `/var/lib/postgresql` según la convención
de PostgreSQL 18. Es independiente de PISDATA. `db:down` conserva el volumen;
no utilizar `docker compose down -v`, ya que elimina los datos locales.

```bash
npm run prisma:validate
npm run prisma:generate
```

Prisma carga `DATABASE_URL` desde `.env` mediante `prisma.config.ts`. El cliente
generado se guarda en `src/generated/prisma` y está ignorado por Git. El esquema
todavía no contiene modelos: no hay tablas de negocio, migraciones ni seed.
La integración de PrismaClient con Next.js se realizará después del diseño del
modelo de dominio. Supabase y Vercel siguen como infraestructura planificada.

## Validación y ejecución de producción

```bash
npm run lint
npm run build
npm run start
```

`npm run start` sirve la compilación de producción en el puerto 3000.
Los scripts de desarrollo y compilación utilizan Webpack.

## Legacy

El sistema anterior basado en Firebase se conserva en `/legacy` solamente como
referencia funcional y técnica. Sus configuraciones de acceso fueron saneadas;
no debe utilizarse como aplicación productiva.

No se migrarán datos históricos desde Firebase hacia PostgreSQL. La nueva base
comenzará desde cero a partir de la puesta en marcha de Control Total v2.

Temporalmente permanecen `index.html`, `Reporte_Unificado70.html`, `assets/`,
`scripts/`, `tests/` y `launcher/` del sistema anterior. No interfieren con las
rutas de Next.js y no se incorporan a la aplicación nueva. TypeScript y ESLint
validan la nueva base sin refactorizar el código histórico.

Las instrucciones y notas anteriores se conservaron en
[legacy/README-aplicacion-anterior.md](legacy/README-aplicacion-anterior.md).
Describen exclusivamente el sistema histórico. Consultar también
[legacy/README.md](legacy/README.md).
