# Control Total V2

Nueva aplicación operacional para Control y Monitoreo de pisciculturas.

**Estado:** Control Total V2 en desarrollo. Configuración permite administrar
pisciculturas, parámetros y los cinco catálogos de eventos; Auditoría permite consultar sus cambios. Las demás
secciones operacionales siguen en desarrollo y muestran estados vacíos.

## Stack actual

- Next.js con App Router
- TypeScript
- Tailwind CSS
- PostgreSQL 18 local con Docker Compose
- Prisma 7 con esquema relacional y migraciones versionadas
- Supabase Auth con sesiones SSR en cookies

## Estructura del repositorio

- `src/app/`: rutas, páginas y acciones de Next.js.
- `src/components/` y `src/lib/`: interfaz y lógica de servidor de V2.
- `prisma/`: esquema, migraciones y datos maestros de PostgreSQL.
- `tests/auth/` y `tests/db/`: pruebas de V2.
- `legacy/`: código y documentación históricos de V1, aislados de Next.js.

El HTML, CSS, JavaScript y launcher de V1 no forman parte de la aplicación V2.
La copia operativa independiente de V1 se mantiene fuera de este repositorio.

## Documentación funcional y técnica

Consultar el [índice de documentación](docs/README.md) para las [especificaciones de módulos](docs/modulos/), las [decisiones arquitectónicas](docs/decisiones/) y el [modelo de datos](docs/arquitectura/modelo-datos.md). El [roadmap](docs/planificacion/roadmap.md) distingue lo implementado de lo pendiente.


## Desarrollo local

Usar Node.js 24 LTS (indicado en `.nvmrc`) y npm. Con nvm disponible:

```bash
nvm use
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).
El acceso requiere iniciar sesión con la cuenta autorizada en Supabase Auth.
Configuración y Auditoría consultan PostgreSQL mediante Prisma. El resto de
los módulos aún no tiene operaciones de base de datos en la interfaz.

## PostgreSQL local

Control Total utiliza PostgreSQL 18 en Docker durante desarrollo. Se requiere
Docker con Docker Compose. Crear `.env` a partir de `.env.example` si no existe y
configurar `POSTGRES_PASSWORD` con una contraseña exclusiva de desarrollo.
Configurar `DATABASE_URL` y `DIRECT_URL` con la misma conexión:
`postgresql://controltotal:<contraseña-local>@localhost:5434/controltotal_dev?schema=public`.
Si la contraseña contiene caracteres reservados de URL, codificarlos en ambas URL.
Las credenciales locales se guardan únicamente en `.env`, que no se versiona.
Configurar también Supabase Auth según la sección siguiente.

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
npm run prisma:migrate:status
npm run prisma:seed
```

Prisma carga `DATABASE_URL` desde `.env` mediante `prisma.config.ts`. El cliente
generado se guarda en `src/generated/prisma` y está ignorado por Git. El esquema
incluye 19 modelos y tres enums. La migración inicial
`20261008181019_init_control_total` crea las tablas, relaciones, índices y
restricciones locales; tres migraciones normalizan nombres de pisciculturas
y parámetros, y otra agrega unicidad normalizada a los catálogos de eventos. Para aplicar migraciones pendientes en una base local
nueva, ejecutar `npm run prisma:migrate:dev`. `npm run prisma:migrate:status`
muestra su estado. El seed se puede repetir sin duplicar datos y contiene sólo
datos maestros; sus catálogos de eventos se limitan a los valores predeterminados
confirmados en el código legacy. Motivos, submotivos y opciones adicionales
configuradas en Firestore siguen pendientes de confirmar.

Supabase se utiliza exclusivamente para
autenticación, sesiones e identidad; los datos operacionales permanecen en
PostgreSQL Docker y se acceden mediante Prisma. No se crean tablas de usuarios
o sesiones locales ni se consultan tablas operacionales mediante Supabase.

### Cliente Prisma y pruebas relacionales

`src/lib/prisma.ts` exporta el cliente para código de servidor Node.js. Usa el
cliente generado, `@prisma/adapter-pg` 7.10.1 y `pg` con `DATABASE_URL`; falla
con un mensaje sin credenciales si falta la URL. Se marca `server-only` y guarda
el cliente en `globalThis` durante desarrollo para reutilizar el pool entre
recargas de Next.js. Las futuras operaciones privadas deben llamar
`requireAuthorizedUser()` antes de consultar Prisma, incluso desde Server
Actions y Route Handlers. El layout privado declara el runtime Node.js;
no se debe importar este módulo en Client Components ni en Proxy.

Los scripts y pruebas crean un cliente independiente mediante
`createPrismaClient()` de `src/lib/prisma-client.ts` y siempre esperan
`$disconnect()` en `finally`. Para comprobar conexión, catálogos y relaciones:

```bash
npm run db:up
npm run prisma:migrate:status
npm run test:db
```

`test:db` requiere Node 24, dependencias instaladas, `.env` local y PostgreSQL
disponible en `localhost:5434/controltotal_dev` con el seed inicial. Rechaza
otras direcciones, puertos, bases, esquemas y parámetros SSL antes de escribir.
Ejecuta `SELECT 1`, lee cantidades de maestros y compara los conteos de las 19
tablas antes y después. No usa Supabase ni muestra contraseñas.
Las pruebas lógicas se pueden ejecutar por separado sin PostgreSQL con
`node --test tests/db/window.test.mjs`.

Cada escenario de escritura corre en una transacción interactiva que lanza una
excepción de control para forzar `ROLLBACK`; cualquier error inesperado también
revierte la transacción. Los errores de restricciones se aíslan con
`SAVEPOINT`/`ROLLBACK TO SAVEPOINT` dentro de ella. PostgreSQL revierte una
transacción abierta si el proceso pierde la conexión. Las pruebas lógicas de
ventanas usan `America/Santiago` y el runner nativo de Node con `tsx`; no
requieren la base. Ningún fixture se confirma y se conservan los registros
preexistentes. No usar `prisma migrate reset` ni eliminar el volumen Docker.

La combinación `motivoId`/`submotivoId` actualmente sólo tiene claves foráneas
independientes: PostgreSQL acepta un submotivo de otro motivo o un submotivo sin
motivo. Antes de crear el módulo Eventos, conviene imponer una clave foránea
compuesta `(submotivo_id, motivo_id)` hacia una clave única de
`submotivo_evento(id, motivo_id)` y un `CHECK` que exija motivo cuando haya
submotivo. Esto protege también escrituras ajenas al servicio. La alternativa
de validarlo sólo en el servicio es más simple al inicio, pero permite
inconsistencias desde SQL, scripts u otros clientes.

## Supabase Auth e inicio de sesión local

Conservar el `.env` existente. Para una instalación nueva, copiar `.env.example`
y configurar estas variables sin versionar credenciales:

```env
NEXT_PUBLIC_SUPABASE_URL=<URL del proyecto Supabase>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave publicable del proyecto>
CONTROL_USER_EMAIL=asistente.controlymonitoreo@cermaq.com
```

Se utiliza exclusivamente la clave publicable; no configurar claves de servicio
ni claves secretas en el cliente. Mantener `DATABASE_URL` y `DIRECT_URL` apuntando
a PostgreSQL Docker en `localhost:5434`.

El proyecto Supabase remoto debe estar activo y accesible para permitir el
inicio de sesión local y verificar sesiones existentes. La cuenta debe existir
previamente en Supabase Auth. La aplicación no ofrece registro público ni
recuperación de contraseña. Es recomendable deshabilitar nuevos registros en la
configuración de Auth del proyecto si sólo se utilizará la cuenta existente.

Ejecutar `npm run dev`, abrir [localhost:3000](http://localhost:3000) e ingresar
correo y contraseña en `/login`. El servidor llama `signInWithPassword` y después
`getUser()` para comprobar la identidad y su correo contra `CONTROL_USER_EMAIL`.
La comparación elimina espacios en los extremos y no distingue mayúsculas;
no acepta alias ni direcciones alternativas. Una configuración vacía, otra
cuenta o una verificación fallida deniegan el acceso. Una cuenta no autorizada
se desconecta del navegador al intentar ingresar.

Los clientes de `@supabase/ssr` administran las cookies. `src/proxy.ts` llama
`getClaims()` para verificar/renovar tokens, sincroniza cookies de request y
response y aplica cabeceras para impedir caché compartida. El layout y cada
página privada llaman `requireAuthorizedUser()`, que comprueba el estado actual
mediante `getUser()`. El resultado sólo se deduplica durante el mismo render.
Un usuario autorizado en `/login` vuelve a `/`; los demás ven el formulario.
Si el proxy no pudo verificar el token por una indisponibilidad de Auth,
`/login?reason=unavailable` muestra el aviso sin regresar a la ruta que falló,
incluso si la consulta de usuario responde durante una caída parcial del servicio.

El botón **Cerrar sesión** usa una Server Action y `signOut({ scope: "local" })`;
limpia cookies, invalida la caché de navegación y redirige a `/login`. Si falla el
servicio remoto, igualmente se eliminan las cookies de este navegador y se
informa que no pudo confirmarse el cierre remoto.

Cada futura Server Action o Route Handler que lea o modifique información
privada debe llamar individualmente a `requireAuthorizedUser()` antes de usar
Prisma. Pasar por el layout o por el proxy no autoriza esas operaciones.

### Pruebas de autenticación

```bash
npm run test:auth
```

Las pruebas usan el runner nativo de Node y TypeScript ya instalado, con dobles
de Supabase y Next.js. No utilizan credenciales ni modifican cuentas reales.
Cubren autorización, formularios, redirecciones, logout, páginas privadas y
renovación/expiración simuladas con sincronización de cookies.

Verificación manual con la cuenta de pruebas existente (contraseña sólo en el
navegador, nunca en scripts ni en el repositorio):

1. Abrir una ventana privada y entrar a `http://localhost:3000`: debe ir a `/login`.
2. Probar una contraseña incorrecta: debe mostrar un error genérico.
3. Ingresar con la cuenta autorizada: debe redirigir a `/` y mostrar su correo.
4. Navegar por todos los módulos, recargar y visitar `/login`: debe volver a `/`.
5. Cerrar sesión, usar Atrás, abrir una ruta privada y recargar: debe exigir login.
6. Si ya existe otra cuenta de pruebas, intentar ingresar: debe denegar acceso y
   limpiar su sesión local. No crear ni modificar cuentas para esta prueba.
7. Para observar renovación real, mantener abierta la sesión hasta el vencimiento
   normal del access token y navegar/recargar. Revisar que siga autenticada y que
   se actualicen cookies sin copiar sus valores. Si vence también la sesión o se
   eliminan sus cookies en DevTools, una ruta privada debe volver a `/login`.
8. Comprobar que una caída de Supabase no permita acceder a páginas privadas.

## Validación y ejecución de producción

```bash
npm run lint
npm run build
npm run start
```

`npm run start` sirve la compilación de producción en el puerto 3000.
Los scripts de desarrollo y compilación utilizan Webpack.

## Legacy

El sistema anterior basado en Firebase se conserva en `legacy/` solamente como
referencia funcional y técnica. Incluye una instantánea de su código, pruebas
históricas y notas de auditoría; no se integra con V2 ni se usa como aplicación
operativa desde este repositorio. Sus configuraciones de acceso fueron saneadas.

No se migrarán datos históricos desde Firebase hacia PostgreSQL. La nueva base
comenzará desde cero a partir de la puesta en marcha de Control Total v2.

Las instrucciones y notas anteriores se conservaron en
[legacy/README-aplicacion-anterior.md](legacy/README-aplicacion-anterior.md).
Describen exclusivamente el sistema histórico. Consultar también
[legacy/README.md](legacy/README.md) y el
[inventario de limpieza](legacy/INVENTARIO-LIMPIEZA.md).
