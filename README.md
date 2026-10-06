# Plataforma B2B · IoT FENSTER

Portal de pedidos para partners (fabricantes de ventanas, distribuidores y herrajes) que compran los dispositivos IoT de **IoT FENSTER** (Wave, ICON, Connect, C-WALL, Pulsar, EVO…).

**No hay pago en línea.** El partner confirma un pedido con su número de orden de compra (PO) y IoT FENSTER lo gestiona por orden de compra diferida: preparación, envío y seguimiento.

> Repositorio privado. Las cuentas de prueba y los detalles de entorno están en [`SETUP.md`](SETUP.md); no se documentan aquí.

---

## Qué hace

| Para el partner | Para IoT FENSTER (admin / comercial) |
|---|---|
| Registrar su empresa y verificar su correo corporativo | Aprobar o rechazar partners y fijar su marca, tarifa y descuento |
| Ver **solo su catálogo**, con los nombres y precios de su marca | Gestionar el catálogo base y asignarlo a cada partner |
| Carrito persistente | Ver y mover los pedidos por estados, con transportista y seguimiento |
| Checkout en 2 pasos con PO, dirección y notas | Panel de estadísticas y auditoría de acciones |
| Recibir resumen en PDF y correos de cada cambio de estado | Gestionar usuarios de cada partner (activar, forzar cierre de sesión, restablecer contraseña) |
| Interfaz en 5 idiomas: ES, EN, DE, IT, PT | Alta manual de partners y rol **Comercial** con partners acotados |

## Reglas de negocio clave

- **Aprobación manual.** Un partner nuevo verifica su correo (token de 24 h) y queda pendiente hasta que un administrador lo aprueba y le asigna marca comercial, tarifa y descuento (%).
- **Catálogo multimarca sin fugas.** Un mismo aparato se vende con nombres distintos según el partner (por ejemplo, *Wave-1* en VBH, *Icon1* en Procomsa y *Connect-1* en MySmartWindow). En la base es **un único `ProductoBase`** y cada partner tiene su propia `RepresentacionPartner` (SKU comercial, nombre, imagen, documentación, PVP). El partner nunca recibe el SKU industrial, el nombre técnico, los GTIN ni los nombres de otras marcas.
- **Precio de tarifa único, descuento por partner.** El PVP sale de la tarifa y es el mismo para todos; lo que cambia es el descuento del partner (y, más adelante, por producto).
- **Congelación de precios.** Al confirmar, una transacción ACID genera el código de pedido, vacía el carrito y guarda una "fotografía" comercial de cada línea (SKU, nombre, PVP histórico, descuento, precio neto y total). Si el precio cambia mientras el cliente decide, la confirmación se rechaza (`PRECIOS_CAMBIADOS`) y no se crea el pedido.
- **Estados del pedido:** `RECIBIDO → CONFIRMADO → EN_PREPARACION → PREPARADO → ENVIADO`, más `CANCELADO`. Al enviar se registran transportista, expedición y URL de seguimiento.

## Seguridad (Zero-Trust)

- Identidad del partner extraída **en el servidor** a partir del token de sesión; el cliente nunca indica de qué partner es.
- JWT en cookie **HttpOnly, Secure y SameSite=Strict**, con cierre de sesión forzado y reseteo de contraseña que invalidan los tokens anteriores.
- Filtrado estricto por partner en cada consulta. Un producto o pedido ajeno responde **404 opaco**, indistinguible de uno inexistente.
- UUID v4 en todas las tablas, contraseñas con bcrypt, validación de entrada con `class-validator`, cabeceras con Helmet y limitación de peticiones.
- **Auditoría** en JSON estructurado (login, confirmación de pedido, cambios de expedición, accesos a recursos).
- El catálogo del partner es una **lista blanca** de campos; lo demás es interno por defecto.

## Roles

| Rol | Alcance |
|---|---|
| `ADMIN_FENSTER` | Todo: partners, catálogo base, pedidos, estadísticas y usuarios |
| `COMERCIAL` | Solo los partners que ha dado de alta; catálogo y pedidos de esos partners |
| `PARTNER_ADMIN` | Gestiona su empresa y sus usuarios |
| `PARTNER_COMPRADOR` | Compra en su catálogo |
| `PARTNER_CONSULTA` | Solo consulta |

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query, Zustand, next-intl, Lucide |
| Backend | NestJS 12, TypeScript, Passport (JWT), Helmet |
| Datos | PostgreSQL 16 con Prisma 7 |
| Caché | Redis 7 (estadísticas; tolerante a fallos) |
| Correo y PDF | Resend y PDFKit |
| Tests | Vitest |

## Estructura

```
.
├── backend/                 API NestJS
│   ├── prisma/              schema.prisma y migraciones
│   ├── scripts/             seeds e importaciones (admin, comercial, partners, dispositivos)
│   │   └── data/            dispositivos.json (catálogo agrupado por aparato)
│   └── src/
│       ├── auth/            registro, login, verificación, aprobación, sesión
│       ├── partners/        partners, usuarios y catálogo asignado
│       ├── productos/       catálogo base y catálogo del partner
│       ├── carrito/         carrito persistente
│       ├── pedidos/         checkout, estados, estadísticas, PDF
│       ├── auditoria/       registro de auditoría
│       └── common/          guards, interceptores, email, pdf, redis
├── frontend/                Next.js
│   ├── messages/            traducciones (es, en, de, it, pt)
│   └── src/
│       ├── app/             rutas: catálogo, carrito, checkout, pedidos, admin/*
│       ├── components/      navbar, marca, modales, formularios
│       └── lib/             cliente de API, tipos, utilidades de catálogo
├── docker-compose.yml       PostgreSQL y Redis
└── SETUP.md                 guía detallada de puesta en marcha
```

## Puesta en marcha

Requisitos: Node.js, Docker Desktop en ejecución y Git.

```bash
# 1. Base de datos y Redis (PostgreSQL en el puerto 5433, Redis en el 6379)
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env          # rellena los valores (ver tabla)
npx prisma migrate deploy
npx prisma generate
npm run seed:admin            # ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_NOMBRE por variables de entorno
npm run import:dispositivos   # carga el catálogo base con sus precios de tarifa
npm run start:dev             # http://localhost:3010

# 3. Frontend (otra terminal)
cd frontend
npm install
npm run dev                   # http://localhost:3004
```

La guía completa, con comprobaciones y solución de problemas, está en [`SETUP.md`](SETUP.md).

### Variables de entorno (`backend/.env`)

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `PORT` | Puerto del API (3010) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Firma y caducidad de la sesión |
| `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN` | Caducidad del enlace de verificación (24 h) |
| `PASSWORD_RESET_TOKEN_EXPIRES_IN` | Caducidad del enlace de restablecer contraseña |
| `REDIS_URL` | Redis |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envío de correos. En desarrollo se deja sin configurar |
| `FRONTEND_URL` | Origen permitido por CORS |
| `COOKIE_SAME_SITE` | Opcional. Por defecto `strict`. Solo se pone a `none` en demos por túnel, donde front y back están en dominios distintos |

Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_URL`, por defecto `http://localhost:3010`. Se incorpora al compilar, así que hay que reiniciar el frontend si cambia.

## Scripts útiles (`backend/`)

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | API en modo desarrollo con recarga |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests de extremo a extremo |
| `npm run lint` | Análisis estático |
| `npm run seed:admin` / `seed:comercial` | Crea el usuario administrador / comercial |
| `npm run import:partners-reales` | Da de alta los partners reales de un listado (datos provisionales por completar) |
| `npm run import:dispositivos` | Carga o actualiza el catálogo base y los precios de tarifa. Es idempotente |
| `npm run seed:demo` / `seed:demo:cleanup` | Datos de prueba masivos y su limpieza |

## Catálogo de dispositivos

El catálogo base se carga desde [`backend/scripts/data/dispositivos.json`](backend/scripts/data/dispositivos.json), agrupado por aparato físico: los nombres y GTIN de cada marca viajan en `especificacionesJson.referencias` y el precio en la columna `pvpTarifa`.

| Aparato | MySmartWindow | VBH (Wave) | Procomsa (Icon) |
|---|---|---|---|
| Connect-1 | Connect-1 | Wave-1 | Icon1 |
| Connect-2 | Connect-2 | Wave-2 | Icon2 |
| C-WALL (Shutter, Sky, Flex) | C-WALL | Wave 3 | Icon Wall |
| Pulsar | Pulsar | Wave-4 | Icon Mini |
| Mando Witooth | bluConnect | WAVE BLUE | ICON BLUE |
| EVO, Connect Smart y cables | mismo nombre para todos los partners | | |

**Asignar el catálogo a un partner** (Admin → Partners → *Catálogo*): elige la marca del partner y con **un clic** se le asignan todos los productos de esa marca, con su nombre, su SKU y el PVP de tarifa. Después solo se quitan las excepciones. Los productos sin precio en la tarifa no se asignan y el panel avisa de cuántos son.

El proceso completo y las decisiones tomadas están en [`PROCESO_CARGA_CATALOGO.md`](PROCESO_CARGA_CATALOGO.md).

## API en resumen

| Área | Rutas principales |
|---|---|
| Autenticación | `POST /auth/registro-partner`, `GET /auth/verificar-email`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/olvide-password`, `POST /auth/resetear-password` |
| Catálogo del partner | `GET /catalogo`, `GET /catalogo/:id` |
| Carrito | `GET /carrito`, `GET /carrito/resumen`, `POST /carrito/items`, `PATCH` y `DELETE /carrito/items/:id` |
| Pedidos | `POST /pedidos/confirmar`, `GET /pedidos`, `GET /pedidos/:id` |
| Administración de pedidos | `GET /pedidos/admin/*`, `PATCH /pedidos/:id/estado` |
| Partners | `GET/POST /partners`, `GET/PATCH /partners/:id`, `suspender`, `reactivar`, `usuarios` |
| Catálogo asignado | `GET/POST /partners/:id/catalogo`, `PATCH/DELETE /partners/:id/catalogo/:repId` |
| Catálogo base | `GET/POST /productos-base`, `PATCH /productos-base/:id`, `POST /productos-base/:id/asignar-masivo` |

## Demo por túnel

Para enseñar la aplicación a alguien fuera de la red se usan túneles de Cloudflare. El frontend debe servirse compilado (`npm run build` y `npm run start`), porque la recarga en caliente de `next dev` no funciona a través del túnel. Los pasos y los tres cambios de configuración necesarios están en [`CONTEXTO_SESION.md`](CONTEXTO_SESION.md). **La cookie con `SameSite=None` es solo para demos: en producción debe ser `Strict`.**

## Documentación del proyecto

| Archivo | Contenido |
|---|---|
| [`SETUP.md`](SETUP.md) | Puesta en marcha desde cero |
| [`DECISIONES.md`](DECISIONES.md) | Decisiones técnicas y su motivo |
| [`PROCESO_CARGA_CATALOGO.md`](PROCESO_CARGA_CATALOGO.md) | Carga del catálogo, paso a paso |
| [`CONTEXTO_SESION.md`](CONTEXTO_SESION.md) | Estado del trabajo y demo por túnel |
| [`INFORME_TECNICO.md`](INFORME_TECNICO.md) | Informe técnico |
| [`PROGRESO.md`](PROGRESO.md) | Bitácora de avance |
| [`docs/crm/`](docs/crm/README.md) | CRM comercial con Zoho: funcionalidades, conexión con la plataforma, correos y maqueta |

## Pendiente

- Precio de tarifa de Connect-1/2 (Wave-1/2, Icon1/2), Pulsar+, Wave2S+, Wave3 Air y tapas ICON: sin él no se asignan a los partners.
- GTIN de EVO, Connect Smart, C-WALL Flex, los mandos y los cables.
- Crear el partner MySmartWindow y guardar la marca en la ficha de cada partner.
- Asignación automática del catálogo al aprobar un partner nuevo.
- Antes de producción: `SameSite=Strict`, dominio único para front y back, claves reales de correo y contraseñas nuevas para las cuentas de prueba.
- Producción en AWS (RDS, ElastiCache, variables y copias de seguridad): ver [`DESPLIEGUE_AWS.md`](DESPLIEGUE_AWS.md).
