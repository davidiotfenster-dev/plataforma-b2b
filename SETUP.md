# SETUP — Plataforma B2B IoT FENSTER (backend)

Guía paso a paso para levantar la base de datos e inicializar Prisma desde cero
en un equipo nuevo. Ejecuta todos los comandos desde la raíz del proyecto salvo
que se indique lo contrario.

## 0. Requisitos previos

- Node.js (versión compatible con NestJS 12 / TypeScript 6, ver `backend/package.json`).
- Docker Desktop instalado y en ejecución.
- Ningún otro servicio escuchando en el puerto `5433` del host (ver nota de
  puerto más abajo).

## 1. Levantar PostgreSQL con Docker

```bash
docker compose up -d
```

Esto arranca el contenedor `fenster-postgres` (imagen `postgres:16`) con:

- Usuario: `fenster`
- Contraseña: `fenster_dev`
- Base de datos: `fenster`
- Puerto publicado en el host: **5433** (mapeado al `5432` interno del contenedor)

> **Nota de puerto:** `docker-compose.yml` publica Postgres en `5433:5432` en
> lugar del `5432:5432` habitual, porque en el equipo de desarrollo original el
> `5432` del host ya estaba ocupado por otro proyecto ajeno a IoT FENSTER. Si en
> tu máquina el `5432` está libre y prefieres usarlo, puedes cambiar el mapeo en
> `docker-compose.yml` a `"5432:5432"`, pero entonces debes actualizar también
> `DATABASE_URL` en `backend/.env` (ver paso 3) para que ambos coincidan. Ver
> `DECISIONES.md` para el detalle de esta decisión.

Comprueba que el contenedor está sano:

```bash
docker compose ps
```

Deberías ver `fenster-postgres` en estado `Up`, con `0.0.0.0:5433->5432/tcp`.

## 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

## 3. Variables de entorno

Copia el archivo de ejemplo (o créalo si no existe) y ajusta valores si hace
falta:

```bash
cp .env.example .env
```

Contenido esperado de `backend/.env`:

```
DATABASE_URL="postgresql://fenster:fenster_dev@localhost:5433/fenster?schema=public"
```

`backend/.gitignore` ya excluye `.env` del control de versiones.

## 4. Prisma: validar, migrar y generar el cliente

El proyecto usa **Prisma 7**. La configuración de conexión vive en
`backend/prisma7.config.ts` (lee `DATABASE_URL` desde `.env` mediante
`dotenv/config`), no directamente en `schema.prisma`.

Desde `backend/`:

```bash
npx prisma validate
npx prisma migrate dev --name init
npx prisma generate
```

- `prisma validate` comprueba que `prisma/schema.prisma` es sintácticamente
  correcto.
- `prisma migrate dev --name init` crea (si no existe) la migración inicial en
  `backend/prisma/migrations/` y la aplica contra la base de datos de los pasos
  1–3. Si ya existe una migración `init`, este comando aplicará únicamente las
  migraciones pendientes.
- `prisma generate` genera el cliente TypeScript en
  `backend/src/generated/prisma/` (ruta dentro de `src/` a propósito, para
  cumplir el `rootDir` de `tsconfig.build.json`; ver `DECISIONES.md`). Esta
  carpeta está excluida de git.

Si `migrate dev` falla porque no puede conectar con la base de datos:

1. Verifica que el contenedor sigue arriba: `docker compose ps`.
2. Si no está arriba: `docker compose up -d` y espera ~15 segundos antes de
   reintentar.
3. Verifica que `DATABASE_URL` en `backend/.env` usa el mismo puerto que
   publica `docker-compose.yml`.

## 5. Compilar y arrancar el backend

```bash
npm run build
npm run start:dev
```

`npm run build` debe terminar sin errores. `npm run start:dev` arranca NestJS
en modo watch; en el log de arranque debería verse el mensaje de `PrismaService`
confirmando la conexión a PostgreSQL.

## 6. Reiniciar desde cero (opcional)

Para borrar todos los datos y volver a aplicar las migraciones desde el
principio:

```bash
cd backend
npx prisma migrate reset
```

Este comando **elimina todos los datos** de la base de datos `fenster` y vuelve
a aplicar todas las migraciones. Úsalo solo en entornos de desarrollo.

## 7. Frontend

```bash
cd frontend
npm install
npm run dev
```

Arranca en `localhost:3004` (puerto configurado en el proyecto). Necesita
`frontend/.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:3010` apuntando
al backend en modo dev.

## 8. Usuarios ficticios de prueba

Creados manualmente en la base de datos de desarrollo para poder probar la
plataforma sin pasar cada vez por el flujo completo de registro + verificación
de email + aprobación manual. **Si se ejecuta `prisma migrate reset`, se
borran y hay que recrearlos** (no existe un script de seed para esto en el
repo, se hizo con un script temporal que se descartó tras usarlo).

| Rol | Email | Contraseña |
|---|---|---|
| `ADMIN_FENSTER` | `admin@fenster.test` | `Fenster2026!` |
| `COMERCIAL` | `comercial@fenster.test` | `Fenster2026!` |
| `PARTNER_ADMIN` (partner ya `ACTIVO`, 10% descuento) | `partner@fenster.test` | `Fenster2026!` |

> El usuario `COMERCIAL` se crea con `npm run seed:comercial` (variables
> `COMERCIAL_EMAIL`/`COMERCIAL_PASSWORD`/`COMERCIAL_NOMBRE`, mismo patrón que
> `seed:admin`). Si se resetea la base de datos, hay que volver a ejecutarlo.

El partner de prueba se llama "Partner Ficticio S.L." (CIF `B00000001`) y
tiene un producto de catálogo de prueba: SKU comercial `FEN-VC-120150`
("Ventana Corredera Fenster 120x150"), PVP base 250€.

> Si el login del partner de prueba empieza a fallar con 401, comprobar antes
> que el partner no haya quedado en estado `SUSPENDIDO` (un partner
> suspendido no puede hacer login, es el comportamiento esperado — ver
> `PROGRESO.md`, entrada del 2026-09-28).

## 9. Envío de emails (Resend)

Sin esto configurado, el sistema sigue funcionando con normalidad pero no
envía correos de verdad (confirmación de pedido, cambio de estado,
verificación de registro): se queda anotado en el log del backend
(`[DEV] Email no enviado (falta RESEND_API_KEY)...`).

Proveedor elegido: **[Resend](https://resend.com)** (ya integrado en
`backend/src/common/email/email.service.ts`, no hace falta tocar código).
Plan gratuito: 3.000 emails/mes — de sobra para el volumen de este proyecto.

Pasos:

1. Crear cuenta en [resend.com](https://resend.com).
2. **Domains → Add Domain** → añadir `iotfenster.com` (dominio real de la
   empresa).
3. Añadir los registros DNS (TXT/CNAME) que Resend indique, en el proveedor
   donde esté contratado el dominio. Esperar a que el dominio quede
   `Verified`.
4. **API Keys → Create API Key** → copiar la clave (empieza por `re_`).
5. Ponerla en `backend/.env`:
   ```
   RESEND_API_KEY="re_xxxxxxxxxxxx"
   ```
6. `EMAIL_FROM` ya está puesto a `pedidos@iotfenster.com` — no hace falta
   cambiarlo, solo confirmar que esa dirección existe bajo el dominio
   verificado (o cambiarla por otra del mismo dominio si se prefiere, p. ej.
   `no-reply@iotfenster.com`).
7. Reiniciar el backend (`npm run start:dev`) para que recoja la variable
   nueva.

## Referencia rápida de comandos

| Acción | Comando |
|---|---|
| Levantar Postgres | `docker compose up -d` |
| Parar Postgres | `docker compose down` |
| Instalar dependencias | `cd backend && npm install` |
| Validar schema Prisma | `npx prisma validate` (desde `backend/`) |
| Crear/aplicar migraciones | `npx prisma migrate dev --name <nombre>` (desde `backend/`) |
| Generar cliente Prisma | `npx prisma generate` (desde `backend/`) |
| Compilar backend | `npm run build` (desde `backend/`) |
| Arrancar en desarrollo | `npm run start:dev` (desde `backend/`) |
| Resetear base de datos | `npx prisma migrate reset` (desde `backend/`) |
