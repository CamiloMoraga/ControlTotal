# Control Total

Nueva aplicación operacional para Control y Monitoreo de pisciculturas.

**Estado:** Control Total v2 en desarrollo. Los módulos disponen de navegación y
estados vacíos; sus funcionalidades operacionales aún no están implementadas.

## Stack actual

- Next.js con App Router
- TypeScript
- Tailwind CSS

## Stack planificado

- PostgreSQL / Supabase
- Prisma
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
La aplicación inicia sin archivos de entorno locales ni servicios externos.
`.env.example` queda reservada para las siguientes etapas.

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
