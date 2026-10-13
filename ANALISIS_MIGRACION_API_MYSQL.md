# Análisis: sustituir Prisma/PostgreSQL por API Gateway → Lambda → API corporativa → MySQL

Fecha: 2026-10-06 · Rama analizada: `distribuidores` · Alcance: `backend/src` (sin `generated/`), `backend/prisma`, `backend/scripts`, `frontend/src`.

Arquitectura objetivo:

```
Frontend Next.js ──► NestJS ──► API Gateway (AWS) ──► Lambda Manager ──► API corporativa ──► MySQL
```

---

## 0. Conclusión ejecutiva

1. **Es viable solo si la API corporativa ofrece endpoints de negocio transaccionales.** Hoy hay 10 operaciones que dependen de una transacción de base de datos (la más crítica: confirmar pedido, con bloqueo de numeración). Una transacción no puede abrirse en NestJS y cerrarse tres llamadas HTTP después: cada una tiene que convertirse en **un único endpoint** que haga todo dentro de MySQL. Si la API corporativa solo puede ofrecer CRUD por tabla, el cambio **no es viable** sin perder garantías (pedidos duplicados, numeración con choques, precios incoherentes).
2. **El frontend puede quedar sin cambios**, y los controllers, DTOs, guards, PDF y emails de NestJS también. Lo que cambia es la capa de datos de 9 servicios (154 operaciones Prisma).
3. **La mejor forma de hacerlo con el menor cambio es una capa Repository por dominio** con dos implementaciones (Prisma y HTTP) seleccionables por configuración y dominio a dominio. Primero se refactoriza sin cambiar comportamiento (Prisma), después se activa HTTP dominio a dominio.
4. **Cuatro cosas no pueden traducirse 1:1 sin romperse**: la validación de sesión en cada petición (`JwtStrategy`), la auditoría por petición, la sincronización de catálogos de marca (hasta ~800 consultas en bucle) y el cálculo de estadísticas (9 consultas). Las dos primeras pasan a caché/lotes; las dos últimas tienen que ejecutarse dentro de la API.
5. **Esfuerzo estimado: 80–130 jornadas en total** (≈ 30–45 en NestJS, 35–60 en la API corporativa, el resto en migración de datos, pruebas y corte). **Riesgo: alto**, sobre todo en confirmación de pedidos, concurrencia y latencia.
6. **Antes de decidir conviene responder por qué se hace el cambio** (ver §20). Si el objetivo es que los pedidos y clientes lleguen al sistema corporativo, una integración asíncrona (el portal sigue con su PostgreSQL y publica pedidos/altas a la API corporativa) cuesta una fracción y no pierde ninguna garantía.

---

## 1. Inventario: quién accede hoy a Prisma/BBDD

Acceso centralizado en [prisma.service.ts](backend/src/prisma/prisma.service.ts) (módulo global). **154 operaciones Prisma** en 11 ficheros (sin contar tests ni scripts):

| Fichero | Operaciones | Transacciones |
|---|---:|---:|
| [pedidos.service.ts](backend/src/pedidos/pedidos.service.ts) + [codigo-pedido.ts](backend/src/pedidos/codigo-pedido.ts) | 36 + 2 | 2 |
| [partners.service.ts](backend/src/partners/partners.service.ts) | 27 | 4 |
| [auth.service.ts](backend/src/auth/auth.service.ts) | 26 | 3 |
| [catalogo-marca.service.ts](backend/src/catalogo-marca/catalogo-marca.service.ts) | 18 (+ bucles N×M) | 1 |
| [carrito.service.ts](backend/src/carrito/carrito.service.ts) | 15 | 0 |
| [productos.service.ts](backend/src/productos/productos.service.ts) | 15 | 0 |
| [usuarios.service.ts](backend/src/partners/usuarios.service.ts) | 8 | 0 |
| [imagenes.service.ts](backend/src/imagenes/imagenes.service.ts) | 5 | 0 |
| [jwt.strategy.ts](backend/src/auth/strategies/jwt.strategy.ts) | 1 (en **cada** petición autenticada) | 0 |
| [auditoria.service.ts](backend/src/auditoria/auditoria.service.ts) | 1 (en **cada** petición) | 0 |

Además: 9 scripts en `backend/scripts/` usan Prisma directamente (~29 operaciones) y 10 de los 26 ficheros de test mockean `PrismaService`.

Acoplamiento indirecto a Prisma (aunque no consulten la BD):
- **36 ficheros** importan enums o tipos de `generated/prisma` (DTOs, guards, decoradores, plantillas de email, PDF, services).
- **7 ficheros** usan `Prisma.Decimal`, `Prisma.*WhereInput`, `Prisma.*GetPayload`.
- **11 puntos** traducen códigos de error de Prisma (`P2002` único, `P2025` no encontrado/condición, `P2003` FK) a mensajes de negocio.
- **El frontend depende de la forma JSON de Prisma**: p. ej. `partner._count.usuarios/representaciones/ordenes` en [partners/page.tsx:132](frontend/src/app/admin/partners/page.tsx:132) y [partner-header.tsx:51](frontend/src/app/admin/partners/partner-header.tsx:51); los `Decimal` llegan como string.

---

## 2. Agrupación por dominio (métodos que acceden a BBDD)

### Auth / sesión — `auth.service.ts`, `jwt.strategy.ts`
| Método | Qué lee/escribe |
|---|---|
| `JwtStrategy.validate` | User + Partner (activo, sesionInvalidadaEn, rol, partnerId, estado, archivadoEn). **En cada petición.** |
| `validarCredenciales` | User + Partner por email (bcrypt en Nest) |
| `obtenerPerfil` (`/auth/me`) | User + datos de Partner y dirección de envío |
| `registrarPartner` | **Tx**: crea Partner, crea User, guarda token de verificación |
| `reenviarVerificacion` | User + Partner; actualiza token |
| `verificarEmail` | User + Partner; **Tx**: verifica User y pasa Partner a PENDIENTE_APROBACION |
| `aprobarPartner` | Partner; **Tx**: activa Partner + todos sus Users; luego sincroniza catálogo de marca |
| `rechazarPartner` | Partner; actualiza estado |
| `olvidePassword`, `generarYEnviarTokenReset`, `resetearPassword`, `dispararResetPassword`, `invitarUsuario` | User; guarda/consume token de reset; invalida sesiones |
| `cerrarSesion`, `forzarLogout` | User.sesionInvalidadaEn |
| `actualizarIdioma` | User.idioma |
| `avisarNuevaSolicitud`, `avisarResolucionAlta` | Lista de admins / usuarios del partner para emails |

### Users — `partners/usuarios.service.ts` (el módulo `users/` está vacío)
`listarPorPartner`, `crear` (comprueba empresa activa + email único sin distinguir mayúsculas), `cambiarRol`, `activar`, `desactivar`, `auditoria` (últimos 200 AuditLog del usuario).

### Partners / empresas — `partners.service.ts`
`crear` (**Tx** empresa + usuario, luego sincroniza catálogo), `listar` (con `_count`), `resumen` (groupBy + 2 count), `obtener` + `volumenCompras` (aggregate + count), `actualizar` (bloqueo optimista por `updatedAt`, resincroniza si cambia la marca), `suspender`, `reactivar`, `promocionar`/`degradar` (**Tx** + auditoría), `archivar` (cuenta pedidos en curso), `desarchivar` (resincroniza), `eliminar` (**Tx** auditoría + borrado en cascada), y el catálogo por empresa: `listarCatalogo`, `asignarProductos` (**Tx** N altas), `actualizarRepresentacion`, `eliminarRepresentacion`, `eliminarTodasLasRepresentaciones`.

### Catálogo
- **Vista del cliente** (`productos.service.ts`): `listarCatalogo`, `obtenerRepresentacion` (+ descuento general del partner).
- **Productos base (admin)**: `listarBase`, `crearBase`, `actualizarBase`, `listarRepresentacionesDeBase`, `asignarMasivo`.
- **Catálogos de marca** (`catalogo-marca.service.ts`): `listar`, `anadir`, `rellenar`, `aplicarTarifa` (**Tx**), `actualizar`, `eliminar`, `sincronizarMarca`, `sincronizarEmpresa`.
- **Imágenes** (`imagenes.service.ts`): `asignar`, `quitar`, `limpiar` (cuenta referencias antes de borrar del disco).

### Carrito — `carrito.service.ts`
`obtenerOCrearCart` (upsert), `construirResumen` (líneas + descuento del partner + precio neto), `agregarItem`, `repetirPedido` (bucle por línea), `actualizarCantidad`, `eliminarItem`, `obtenerItemPropio`.

### Pedidos — `pedidos.service.ts`, `codigo-pedido.ts`
`confirmar` (**Tx**, ver §3), `avisarPedidoNuevo`, `listar` (4 consultas en paralelo), `obtener`, `generarPdf`, `generarPdfAdmin`, `pdfDePedido`, `listarTodos` (sin paginar; el frontend ya no lo usa), `resumenPorPartner` (SQL raw), `listarTodosAdmin`, `listarPorPartnerAdmin`, `obtenerAdmin`, `actualizarEstado` (**Tx**), `siguienteCodigoPedido` (advisory lock).

### Estadísticas — dentro de `pedidos.service.ts`
`estadisticas` (caché Redis 120 s), `exportarEstadisticas` (Excel), `calcularEstadisticas`: **9 consultas en paralelo** (3 groupBy, 3 aggregate, 2 SQL raw, 1 findMany). El post-proceso en JS y [estadisticas-periodo.ts](backend/src/pedidos/estadisticas-periodo.ts) / [estadisticas-excel.ts](backend/src/pedidos/estadisticas-excel.ts) no tocan la BD.

### Auditoría
- `AuditoriaService.registrar`: inserta un AuditLog por cada petición HTTP (interceptor global + filtro para 401/403), *fire-and-forget*.
- Eventos de negocio escritos dentro de la misma transacción que el cambio: `PEDIDO_CONFIRMADO`, `PEDIDO_ESTADO_ACTUALIZADO`, `PARTNER_PROMOCIONADO/DEGRADADO`, `PARTNER_ELIMINADO`. Fuera de transacción: `PARTNER_ARCHIVADO/DESARCHIVADO`.

---

## 3. Operaciones con transacción (las 10)

| # | Dónde | Tipo | Qué hace exactamente |
|---|---|---|---|
| 1 | [pedidos.service.ts:84](backend/src/pedidos/pedidos.service.ts:84) `confirmar` | Interactiva | Lee carrito + líneas + producto/marca; rechaza productos retirados; lee el partner; calcula precio neto por línea (descuento del producto o general) y total; si no coincide con `totalEsperado` → 409 `PRECIOS_CAMBIADOS`; **"reclama" el carrito con `deleteMany`** y aborta si no borra todas las líneas (evita doble pedido por doble clic/dos pestañas); obtiene el `PED-xxxxxx` con **advisory lock**; crea Order + OrderItems (fotografía de precios) + historial RECIBIDO; escribe AuditLog. Tras el commit (fuera de tx, best-effort): PDF + email al cliente + email a admins. |
| 2 | [pedidos.service.ts:838](backend/src/pedidos/pedidos.service.ts:838) `actualizarEstado` | Batch | Update del pedido **condicionado al estado leído** (`where: {id, estado}` → si otro admin lo cambió, P2025 → 409 `PEDIDO_CAMBIADO`), limpia/rellena datos de expedición o cancelación, crea historial y AuditLog. La validación de la máquina de estados se hace antes, en Nest. |
| 3 | [auth.service.ts:113](backend/src/auth/auth.service.ts:113) `registrarPartner` | Interactiva | Crea Partner (PENDIENTE_VERIFICACION_EMAIL) + User admin inactivo + firma y guarda el token de verificación. Unicidad CIF/email → 409. |
| 4 | [auth.service.ts:294](backend/src/auth/auth.service.ts:294) `verificarEmail` | Batch | Marca el email verificado y limpia el token; pasa el Partner a PENDIENTE_APROBACION **solo si sigue en PENDIENTE_VERIFICACION_EMAIL** (condicional). |
| 5 | [auth.service.ts:334](backend/src/auth/auth.service.ts:334) `aprobarPartner` | Batch | Asigna marca/tarifa/descuento y ACTIVO al Partner + activa todos sus Users. La sincronización de catálogo posterior **no** está dentro de la tx. |
| 6 | [partners.service.ts:71](backend/src/partners/partners.service.ts:71) `crear` | Interactiva | Crea Partner ACTIVO + User PARTNER_ADMIN. Sincronización de catálogo y bienvenida, fuera. |
| 7 | [partners.service.ts:332](backend/src/partners/partners.service.ts:332) `cambiarTipo` | Batch | Cambia tipo (PARTNER/DISTRIBUIDOR) + AuditLog con el volumen de compra que lo justificó. |
| 8 | [partners.service.ts:413](backend/src/partners/partners.service.ts:413) `eliminar` | Batch | AuditLog + borrado del Partner (cascada a usuarios, catálogo y carritos; los pedidos lo impiden por FK `Restrict` → P2003 → 409). |
| 9 | [partners.service.ts:463](backend/src/partners/partners.service.ts:463) `asignarProductos` | Batch | N altas de RepresentacionPartner, todo o nada (SKU duplicado → 409). |
| 10 | [catalogo-marca.service.ts:104](backend/src/catalogo-marca/catalogo-marca.service.ts:104) `aplicarTarifa` | Batch | N updates de PVP de marca; la sincronización posterior va fuera. |

Operaciones de varios pasos **sin** transacción que la API tendrá que resolver igual o mejor: `sincronizarEmpresa` (borrado + bucle de altas/updates), `agregarItem` y `repetirPedido` (leer-luego-escribir), `asignarMasivo`, `archivar` (cuenta pedidos y luego actualiza), `imagenes.asignar` (disco + BD).

---

## 4. SQL raw, advisory locks y funciones específicas de PostgreSQL

| Dónde | Qué | Equivalente MySQL |
|---|---|---|
| [codigo-pedido.ts:14](backend/src/pedidos/codigo-pedido.ts:14) | `pg_advisory_xact_lock(7310001)` (bloqueo ligado a la transacción) | **No hay equivalente de transacción.** `GET_LOCK` es de sesión (frágil con pools/proxies). Recomendado: tabla contador de una fila con `SELECT … FOR UPDATE` dentro de la tx. |
| [codigo-pedido.ts:15](backend/src/pedidos/codigo-pedido.ts:15) | `MAX(CAST(SUBSTRING("codigoPed" FROM 5) AS INTEGER))` + operador regex `~` | `REGEXP` / `SUBSTRING(x, 5)`; mejor la tabla contador |
| [pedidos.service.ts:465](backend/src/pedidos/pedidos.service.ts:465) | `COUNT(...) FILTER (WHERE ...)`, `ILIKE`, `::uuid`, `::bigint` | `SUM(CASE WHEN …)`, `LIKE` con collation `_ci` |
| [pedidos.service.ts:476](backend/src/pedidos/pedidos.service.ts:476) | `COUNT(DISTINCT …)::bigint` | directo |
| [pedidos.service.ts:641](backend/src/pedidos/pedidos.service.ts:641) | casts `::uuid`, `::"MarcaCatalogo"` (enum nativo) | sin casts |
| [pedidos.service.ts:649](backend/src/pedidos/pedidos.service.ts:649) | `date_trunc('day'/'week'/'month', …)` | `DATE()`, `DATE_SUB(DATE(x), INTERVAL WEEKDAY(x) DAY)`, `DATE_FORMAT(x,'%Y-%m-01')` (ojo: semana ISO desde lunes y zona horaria UTC) |
| 6 sitios (`partners`, `pedidos`, `usuarios`, script `migrar-partners-clientes`) | `mode: 'insensitive'` | En MySQL depende de la collation (`utf8mb4_0900_ai_ci` es insensible a mayúsculas **y acentos**) |
| Esquema | Enums nativos (`ALTER TYPE … RENAME VALUE` en [20261002150000](backend/prisma/migrations/20261002150000_renombrar_tipo_empresa_cliente_a_distribuidor/migration.sql)), `@db.Uuid`, `Json`, `Decimal(12,2)`, `TIMESTAMP(3)` | `ENUM`/`VARCHAR`, `CHAR(36)`/`BINARY(16)`, `JSON`, `DECIMAL`, `DATETIME(3)` |
| Migración [20260930160000](backend/prisma/migrations/20260930160000_historial_estados_pedido/migration.sql) | `gen_random_uuid()`, operador JSON `->>`, cast a enum | Solo histórica; no se reejecuta |
| Generación de UUID | `@default(uuid())` (v4, lo genera Prisma) | **`UUID()` de MySQL es v1**: generar v4 en Nest o en la Lambda (CLAUDE.md exige v4) |

---

## 5. Lógica de negocio mezclada con las consultas

| Regla | Dónde vive hoy | Problema al pasar a HTTP |
|---|---|---|
| Visibilidad del catálogo (`activo` + producto base activo + producto de marca activo) | `REPRESENTACION_VISIBLE` (cláusula `where`) y `representacionDisponible` (JS) en [catalogo-marca.service.ts:20](backend/src/catalogo-marca/catalogo-marca.service.ts:20) | La API debe implementar exactamente la misma regla |
| Precio neto = PVP × (1 − desc/100), redondeo 2 decimales; descuento del producto prevalece sobre el general | [precio-neto.ts](backend/src/common/precio-neto.ts), usada por catálogo, carrito y pedido | El precio que se congela en el pedido debe calcularse **dentro** de la tx de MySQL; si la fórmula vive en Nest y en la API, deben redondear igual (decimal.js HALF_UP ≈ `ROUND()` de MySQL para positivos) |
| Aislamiento por empresa | `where: {id, partnerId}` o "leer por id y comparar" (`pedidos.obtener`, `generarPdf`, `repetirPedido`, `obtenerItemPropio`, `obtenerRepresentacionOFallar`) | Con HTTP, "leer y comparar en Nest" haría viajar datos de otra empresa por la red: los endpoints deben recibir el `partnerId` y filtrar en MySQL |
| Alcance del COMERCIAL (`creadoPorUsuarioId`) | `restringirCreadoPorId` en partners y pedidos | Parámetro de alcance en los endpoints admin (hoy el rol está apagado) |
| Máquina de estados del pedido | `actualizarEstado` (Nest) + update condicionado (BD) | Puede quedarse en Nest si la API acepta `estadoEsperado` |
| Concurrencia optimista de la ficha | `where: {id, updatedAt}` en [partners.service.ts:245](backend/src/partners/partners.service.ts:245) | La API debe aceptar `actualizadoEn` y `updatedAt` con milisegundos (`DATETIME(3)`) |
| Anti-doble-pedido | `deleteMany` de reclamación del carrito | Tiene que ir en la tx de la API + clave de idempotencia |
| Sincronización de catálogo por marca | `sincronizarEmpresa` / `sincronizarMarca` (bucles) | Lógica pesada de datos: tiene que ejecutarse en la API |
| "Datos por completar" (CIF `PENDIENTE…`, dominio `.pendiente.test`) | `DATOS_POR_COMPLETAR` en [partners.service.ts:22](backend/src/partners/partners.service.ts:22) | Filtro a replicar en la API |
| Archivar solo sin pedidos en curso / eliminar solo sin pedidos | count + update / FK Restrict | Comprobación y escritura juntas en la API |
| Limitar reenvíos de reset (2 min) | `iat` del token guardado | Se puede quedar en Nest |
| Imágenes huérfanas | `limpiar` cuenta referencias en BD antes de borrar el fichero del disco de Nest | La API debe devolver qué rutas han quedado sin uso |

---

## 6. Endpoints de negocio propuestos (mínimos)

> **Propuesta final: [PROPUESTA_CONTRATO_API.md](PROPUESTA_CONTRATO_API.md)**, con 38 endpoints y el porqué de cada decisión. Esta sección es el inventario completo de operaciones (56) del que sale esa propuesta.

Reglas comunes:
- Solo los llama NestJS (máquina a máquina). Cabeceras en todas: `X-Request-Id`, `X-Actor-User-Id`, `X-Actor-Partner-Id` (para auditoría y trazas). En escrituras marcadas **[Idem]**: `Idempotency-Key`.
- Los IDs (UUID v4) de lo que se crea los genera NestJS y los envía: hace las altas idempotentes y permite firmar el token de verificación antes de llamar.
- Errores estructurados: `{codigo, campo?}` con `NO_ENCONTRADO`, `DUPLICADO(campo)`, `CONFLICTO_ESTADO`, `CONFLICTO_VERSION`, `PRECIOS_CAMBIADOS`, `INTEGRIDAD`.
- Ningún endpoint devuelve datos por id sin el parámetro de alcance (empresa o `creadoPor`).

**A. Sesión y cuentas (10)**
| # | Endpoint | Sustituye |
|---|---|---|
| 1 | `POST /v1/auth/credenciales` `{email}` → datos para validar (incl. hash) | `validarCredenciales` |
| 2 | `GET /v1/usuarios/{id}/sesion[?perfil=true]` | `JwtStrategy.validate` + `obtenerPerfil` |
| 3 | `POST /v1/usuarios/{id}/sesiones/invalidar` | `cerrarSesion`, `forzarLogout` |
| 4 | `PUT /v1/usuarios/{id}/idioma` | `actualizarIdioma` |
| 5 | `POST /v1/registros` **[Idem]** | `registrarPartner` (tx) |
| 6 | `POST /v1/registros/verificacion` `{userId, token}` → empresa + emails de admins | `verificarEmail` (tx) + `avisarNuevaSolicitud` |
| 7 | `POST /v1/usuarios/buscar` `{email}` (email nunca en la URL) | `reenviarVerificacion`, `olvidePassword` |
| 8 | `PUT /v1/usuarios/{id}/token` `{tipo, token, expira}` | reenviar, reset, invitación |
| 9 | `POST /v1/usuarios/{id}/password` `{token, passwordHash}` (solo si el token coincide y no caducó; invalida sesiones) | `resetearPassword` |
| 10 | `GET /v1/usuarios/admins-activos` | avisos a admins |

**B. Empresas y usuarios (11)**
| # | Endpoint | Sustituye |
|---|---|---|
| 11 | `GET /v1/empresas?estado&tipo&archivadas&busqueda&datosPorCompletar&page&limit&creadoPor` (con contadores) | `listar` |
| 12 | `GET /v1/empresas/resumen?creadoPor` | `resumen` |
| 13 | `GET /v1/empresas/{id}?creadoPor` (ficha + contadores + volumen) | `obtener` + `volumenCompras` |
| 14 | `POST /v1/empresas` **[Idem]** (empresa + usuario + catálogo de marca, atómico) | `crear` + `sincronizarEmpresa` |
| 15 | `PUT /v1/empresas/{id}/ficha` `{…, actualizadoEn}` **[Idem]** (resincroniza si cambia la marca) | `actualizar` |
| 16 | `POST /v1/empresas/{id}/transiciones` `{accion: aprobar\|rechazar\|suspender\|reactivar\|archivar\|desarchivar\|promocionar\|degradar, datos}` **[Idem]** → empresa + destinatarios de email | 8 métodos de `auth`/`partners` |
| 17 | `DELETE /v1/empresas/{id}` `{confirmarRazonSocial}` | `eliminar` (tx) |
| 18 | `GET /v1/empresas/{id}/usuarios` | `listarPorPartner` |
| 19 | `POST /v1/empresas/{id}/usuarios` **[Idem]** | `UsuariosService.crear` |
| 20 | `PATCH /v1/usuarios/{id}/acceso` `{rol?, activo?}` | `cambiarRol`, `activar`, `desactivar` |
| 21 | `GET /v1/usuarios/{id}/auditoria?limit=200` | `auditoria` |

**C. Catálogo (12 filas, 19 operaciones)**
| # | Endpoint | Sustituye |
|---|---|---|
| 22 | `GET /v1/empresas/{p}/catalogo` (visibles, con descuento general) | `listarCatalogo` |
| 23 | `GET /v1/empresas/{p}/catalogo/{repId}` | `obtenerRepresentacion` |
| 24 | `GET /v1/empresas/{id}/catalogo-admin?creadoPor` | `PartnersService.listarCatalogo` |
| 25 | `POST /v1/empresas/{id}/catalogo` (atómico) **[Idem]** | `asignarProductos` (tx) |
| 26 | `PATCH /v1/empresas/{id}/catalogo/{repId}` | `actualizarRepresentacion` |
| 27 | `DELETE /v1/empresas/{id}/catalogo[/{repId}]` (todos los extras o uno) | `eliminarRepresentacion`, `eliminarTodasLasRepresentaciones` |
| 28 | `GET/POST /v1/productos-base`, `PATCH /v1/productos-base/{id}` | `listarBase`, `crearBase`, `actualizarBase` |
| 29 | `GET /v1/productos-base/{id}/representaciones` | `listarRepresentacionesDeBase` |
| 30 | `POST /v1/productos-base/{id}/asignacion-masiva` | `asignarMasivo` |
| 31 | `PUT /v1/productos-base/imagen` `{ids, imagenUrl\|null}` → rutas que quedan sin uso | `imagenes.asignar/quitar/limpiar` |
| 32 | `GET /v1/catalogos-marca/{marca}` | `listar` |
| 33 | `POST /v1/catalogos-marca/{marca}/productos`, `POST …/rellenar`, `POST …/aplicar-tarifa`, `PATCH/DELETE /v1/catalogos-marca/productos/{id}` — **todos sincronizan las empresas dentro de la API** | `anadir`, `rellenar`, `aplicarTarifa`, `actualizar`, `eliminar` + `sincronizarMarca` |

**D. Carrito (5)** — todas las escrituras devuelven el carrito completo con precios vigentes
| # | Endpoint | Sustituye |
|---|---|---|
| 34 | `GET /v1/empresas/{p}/usuarios/{u}/carrito` (lo crea si no existe) | `obtenerResumen` |
| 35 | `POST …/carrito/lineas` `{repId, cantidad}` **[Idem]** | `agregarItem` |
| 36 | `PUT …/carrito/lineas/{itemId}` `{cantidad}` | `actualizarCantidad` |
| 37 | `DELETE …/carrito/lineas/{itemId}` | `eliminarItem` |
| 38 | `POST …/carrito/repetir/{pedidoId}` **[Idem]** → carrito + no disponibles + precios cambiados | `repetirPedido` |

**E. Pedidos (8)**
| # | Endpoint | Sustituye |
|---|---|---|
| 39 | `POST /v1/empresas/{p}/pedidos` `{userId, direccionEnvio, poNumber, notas, totalEsperado}` **[Idem obligatoria]** → pedido + datos para PDF/emails (usuario, razón social, admins) | `confirmar` (tx completa) + `avisarPedidoNuevo` |
| 40 | `GET /v1/empresas/{p}/pedidos?filtros` → página + resumen por estado + enviados 7 días | `listar` |
| 41 | `GET /v1/empresas/{p}/pedidos/{id}` (detalle + historial + fotos; sirve también para el PDF) | `obtener`, `generarPdf` |
| 42 | `GET /v1/pedidos?estado&busqueda&page&limit&creadoPor` | `listarTodosAdmin` |
| 43 | `GET /v1/pedidos/resumen-por-empresa?busqueda&page&limit&creadoPor` | `resumenPorPartner` |
| 44 | `GET /v1/empresas/{p}/pedidos-admin?creadoPor` | `listarPorPartnerAdmin` |
| 45 | `GET /v1/pedidos/{id}?creadoPor` | `obtenerAdmin`, `generarPdfAdmin` |
| 46 | `POST /v1/pedidos/{id}/transiciones` `{estadoEsperado, estadoNuevo, forzar, expedicion, motivoCancelacion}` **[Idem]** → pedido + email/idioma del cliente | `actualizarEstado` (tx) |

**F. Estadísticas y auditoría (3)**
| # | Endpoint | Sustituye |
|---|---|---|
| 47 | `GET /v1/estadisticas?desde&hasta&granularidad&marca&partnerId&limite` (todo el bloque agregado) | `calcularEstadisticas` (9 consultas) |
| 48 | `GET /v1/estadisticas/pedidos?desde&hasta&marca&partnerId` (filas del Excel) | consulta extra de `exportarEstadisticas` |
| 49 | `POST /v1/auditoria/eventos` (lote, con id de evento para deduplicar) | `AuditoriaService.registrar` |

**Total: 56 endpoints (método + ruta)**, agrupados en 49 filas: la #27 son 2, la #28 son 3 y la #33 son 5. Por bloque: sesión 10, empresas y usuarios 11, catálogo 19, carrito 5, pedidos 8, estadísticas y auditoría 3. `GET /pedidos/admin/todos` (`listarTodos`, sin paginar) no se usa en el frontend: se propone retirarlo en vez de migrarlo.

---

## 7. Qué agrupar en un único endpoint (para no multiplicar viajes)

1. **Sesión + perfil**: lo que hoy son `JwtStrategy` + `/auth/me` (2 consultas) → 1 llamada, y además se cachea (ver §9).
2. **Confirmar pedido**: carrito, validaciones, precios, reclamación, numeración, pedido, historial, auditoría **y** los datos para PDF/emails (incluida la lista de admins) → 1 llamada (hoy 8 operaciones + 1).
3. **Toda mutación del carrito devuelve el carrito**: hoy cada mutación hace 2–4 operaciones + 3 del resumen → 1 llamada.
4. **Repetir pedido**: el bucle por línea (2 operaciones por línea) → 1 llamada.
5. **Sincronización de catálogo de marca**: siempre dentro del endpoint que la provoca (alta, aprobación, cambio de marca, desarchivar, editar/añadir/rellenar catálogo, tarifa). Nunca expuesta fila a fila.
6. **Estadísticas**: 9 consultas → 1 llamada (y la caché Redis de 120 s se mantiene en Nest).
7. **Listados con sus contadores**: pedidos del cliente (4 → 1), empresas (2 → 1), resumen de empresas (3 → 1), ficha + volumen (3 → 1).
8. **Transiciones de empresa y de pedido**: lectura + validación + escritura condicionada + efectos + auditoría + destinatarios de email → 1 llamada.
9. **Registro**: empresa + usuario + token → 1 llamada.
10. **Lectura por id + comprobación de propiedad** → siempre en la misma llamada con el alcance como parámetro.

---

## 8. Consultas por página hoy vs llamadas HTTP con el nuevo diseño

Supuestos: cada operación Prisma ≈ 1 viaje a la BD; toda petición autenticada suma hoy 1 consulta de `JwtStrategy` + 1 insert de auditoría. React Query comparte la consulta `["carrito"]` entre el navbar y la página, y `["admin-partner", id]` entre cabecera y página. "Traducción 1:1" = convertir cada operación Prisma en una llamada HTTP (lo que **no** hay que hacer). "Propuesto" = endpoints de §6 + sesión en caché + auditoría en lotes; entre paréntesis, con la caché de sesión fría.

Tiempos orientativos: una consulta local a PostgreSQL ≈ 1–5 ms; una llamada Nest → API Gateway → Lambda → API → MySQL ≈ 40–150 ms en caliente y 0,5–2 s con arranque en frío de la Lambda.

| Página / acción | Peticiones del navegador | Consultas BD hoy (= HTTP en traducción 1:1) | HTTP propuesto |
|---|---:|---:|---:|
| Login (enviar + `/auth/me`) | 2 | 5 | 2 |
| Catálogo | 3 | 12 | 3 (4) |
| Ficha de producto | 3 | 12 | 3 (4) |
| Añadir al carrito | 1 | 9 | 1 |
| Carrito | 2 | 8 | 2 (3) |
| Checkout (paso 2) | 2 | 8 | 2 (3) |
| **Confirmar pedido** | 1 | 10 | 1 |
| Mis pedidos | 3 | 14 | 3 (4) |
| Detalle de pedido | 3 | 11 | 3 (4) |
| Descargar PDF | 1 | 3–4 | 1 |
| Repetir pedido (N líneas) | 1 | 7 + 2N (17 con 5 líneas) | 1 |
| Equipo (usuarios de mi empresa) | 3 | 11 | 3 (4) |
| Admin · Dashboard estadísticas | 2 | 14 (5 con caché Redis) | 2 (1 con caché) |
| Admin · Exportar Excel | 1 | 12 | 2 |
| Admin · Listado de empresas | 4 | 16 | 4 (5) |
| Admin · Ficha de empresa | 2 | 8 | 2 (3) |
| Admin · Guardar ficha | 1 | 4 (≈ 68 si cambia la marca) | 1 |
| Admin · Catálogo de una empresa | 4 | 15 | 4 (5) |
| Admin · Usuarios de una empresa | 3 | 11 | 3 (4) |
| Admin · Aprobar / dar de alta empresa | 1 | ≈ 68 (sincroniza ~58 productos) | 1 |
| Admin · Pedidos (resumen por empresa) | 2 (+1 por tarjeta) | 7 (+3 por tarjeta) | 2 (+1) |
| Admin · Detalle de pedido | 2 | 6 | 2 |
| Admin · Cambiar estado de pedido | 1 | 6 | 1 |
| Admin · Catálogos de marca | 5 | 18 | 5 |
| Admin · Editar un producto de marca | 1 | ≈ 4 + 5 × empresas de la marca (≈ 69 con 13) | 1 |
| Admin · Rellenar catálogo de marca (primera vez) | 1 | ≈ empresas × (4 + productos) (≈ 810 con 13 × 58) | 1 |
| Admin · Catálogo global | 2 | 6 | 2 |

Lectura: con traducción 1:1 una página normal pasaría de ~10 consultas de milisegundos a ~10 llamadas de 50–150 ms (y varias en serie); las operaciones de catálogo de marca serían inviables (cientos de llamadas, por encima del timeout de 29 s de API Gateway). Con endpoints de negocio, el número de llamadas iguala al de peticiones del navegador.

---

## 9. Autenticación, sesiones, autorización y aislamiento

**Hoy**
- Login: `LocalStrategy` → `validarCredenciales` (bcrypt en Nest) → JWT `{sub, partnerId, rol}` firmado por Nest, cookie `fenster_session` HTTP-only, Secure, SameSite=Strict, 8 h.
- **Cada petición** autenticada relee de la BD activo, `sesionInvalidadaEn`, rol, partnerId y estado/archivado de la empresa ([jwt.strategy.ts:70](backend/src/auth/strategies/jwt.strategy.ts:70)): desactivar, forzar cierre, cambiar rol o suspender la empresa tiene efecto **inmediato**. El rol y el partnerId salen de la BD, no del token.
- Autorización: `RolesGuard`, `exigirPuedeComprar` (PARTNER_CONSULTA solo lectura), `identificar()` con 404 opaco, `restringirCreadoPorId` para COMERCIAL (apagado con `COMERCIAL_ACTIVO`).
- Aislamiento: el `partnerId` sale siempre de la sesión; consultas filtradas o "leer y comparar" con 404 opaco.
- Tokens de verificación y reset: JWT firmados por Nest y guardados en la BD para que sean de un solo uso.

**Con la nueva arquitectura**
- **Se mantiene en Nest sin cambios**: emisión del JWT, cookies, CORS, Helmet, throttling, `RolesGuard`, `exigirPuedeComprar`, el interruptor del comercial. El frontend no se entera.
- **`JwtStrategy`**: una llamada HTTP por petición añadiría 40–150 ms (o segundos en frío) a todo. Propuesta: caché en Redis del estado de sesión por usuario (TTL 60 s) con **invalidación explícita** desde Nest en logout, forzar cierre, reset de contraseña, cambiar rol, activar/desactivar, suspender/archivar empresa. **Garantía que se pierde**: si el cambio se hace desde otro sistema corporativo (no desde el portal), tarda hasta 60 s en aplicarse. Si eso no es aceptable, hay que pagar la llamada por petición.
- **Contraseñas**: la opción de menor cambio es que la API devuelva el hash y bcrypt siga en Nest. Implica que el hash viaja por API Gateway/Lambda: TLS y **prohibido registrar cuerpos de respuesta** en logs de API Gateway/Lambda. Alternativa más limpia pero con más cambio: la API verifica la contraseña (entonces viaja la contraseña en claro hasta la Lambda, bajo TLS).
- **Confianza máquina a máquina**: la API confiará en el `partnerId` que le pase Nest. Esa credencial se convierte en una llave maestra de todas las empresas: API privada (VPC endpoint) o autenticación IAM (SigV4), mínimo privilegio, rotación, y la API debe **filtrar por empresa en sus propias consultas** (defensa en profundidad). Opcional y más seguro: propagar la identidad del usuario con un token firmado para que la API autorice por su cuenta.
- **Aislamiento**: cambiar los "leer por id y comparar en Nest" por endpoints con alcance (`/empresas/{p}/pedidos/{id}`), para que los datos de otra empresa nunca salgan de MySQL. Mantener el 404 opaco.
- **PII en URLs**: nunca emails ni tokens en la ruta o la query (API Gateway los registra).

---

## 10. Funciones que deben ser idempotentes

Con HTTP aparecen reintentos (cliente, red, timeouts de API Gateway que cortan la respuesta mientras la Lambda **sigue y confirma**). Lo que hoy es seguro deja de serlo:

| Operación | Qué pasa con un reintento sin idempotencia | Solución |
|---|---|---|
| **Confirmar pedido** | Si se pierde la respuesta tras el commit: el usuario ve error, su carrito está vacío; si lo rellena, pedido duplicado | `Idempotency-Key` obligatoria (Nest la deriva de carrito + líneas + total); la API devuelve el mismo pedido al repetir |
| Añadir al carrito | Suma la cantidad dos veces | `Idempotency-Key` |
| Repetir pedido | Duplica cantidades | `Idempotency-Key` |
| Registro / alta de empresa / alta de usuario | 409 "ya existe" aunque se creó; emails duplicados | UUID generado en Nest + "mismo id y mismos datos → 200" |
| Asignar productos / asignación masiva / añadir a marca | Conflictos de SKU falsos | Idempotencia por clave natural |
| Cambiar estado del pedido | 409 `PEDIDO_CAMBIADO` falso y email duplicado al cliente | `Idempotency-Key`; enviar el email solo si la transición se aplicó en esa llamada |
| Transiciones de empresa | Conflicto falso, emails duplicados | `Idempotency-Key` |
| **Guardar ficha (con `actualizadoEn`)** | El primer intento cambia `updatedAt` → el reintento da `FICHA_CAMBIADA` falso | `Idempotency-Key` |
| Verificar email | Segundo intento → 409 | Si ya está verificado con ese token → 200 |
| Eliminar empresa / quitar producto | 404 en el reintento | Tratar 404 como éxito en reintentos |
| Lotes de auditoría | Eventos duplicados | Id de evento único |

Naturalmente idempotentes: fijar cantidad, fijar idioma, guardar token, invalidar sesiones, consultas. Regla para el cliente HTTP de Nest: **reintentar solo** lecturas y escrituras con `Idempotency-Key`.

---

## 11. Impacto en auditoría

- **Eventos de negocio** (`PEDIDO_CONFIRMADO`, `PEDIDO_ESTADO_ACTUALIZADO`, promoción, eliminación, archivado): hoy se escriben en la misma transacción que el cambio. Deben escribirse **en la API, dentro de su transacción MySQL**, con el actor que llega en cabeceras. Si la API no lo hace, se pierde la garantía "si hay cambio, hay registro".
- **Registro de accesos** (un AuditLog por petición): no puede ser una llamada HTTP por petición. Propuesta: el JSON que ya sale por el log de Nest va a CloudWatch completo, y a MySQL se mandan en lotes (cada pocos segundos o cada N eventos) los de seguridad y negocio. Mismo riesgo que hoy (es *fire-and-forget*), pero con presión acotada: hoy cada petición deja una promesa pendiente; con una API lenta se acumularían.
- **Trazabilidad**: `X-Request-Id` de extremo a extremo (Nest → API Gateway → Lambda → API) para unir los logs de cuatro sistemas.
- **Inmutabilidad**: aprovechar el cambio para que el usuario de MySQL de la API solo tenga `INSERT` en la tabla de auditoría (hoy no está forzado).
- **Logs de AWS**: API Gateway y Lambda pasan a formar parte del rastro; revisar que no registren hash de contraseña, tokens ni emails.
- La consulta `GET usuarios/:id/auditoria` pasa a un endpoint (§6 #21).

## 12. Impacto en migraciones

- Hoy: Prisma Migrate con 18 migraciones en dialecto PostgreSQL (2 escritas a mano) y el esquema vive en este repo.
- Después: el esquema lo gobierna quien gobierne MySQL. Hace falta:
  1. **DDL base en MySQL** (se puede generar con Prisma cambiando el provider a `mysql` y `prisma migrate diff`, y revisarlo a mano: UUID, enums, `DATETIME(3)` para el bloqueo optimista, collation de email/SKU, `ON UPDATE CURRENT_TIMESTAMP(3)` para `updatedAt`, mismas FKs y cascadas, tabla contador de pedidos inicializada con el último `PED`).
  2. **Migración de datos única** PostgreSQL → MySQL (volumen pequeño: del orden de 16 empresas, ~58 productos base según el fichero de importación y pocos pedidos) con verificación: recuentos por tabla, suma de `totalNeto`, lista de `codigoPed`.
  3. **Cambios futuros en 3 despliegues coordinados** (MySQL → API → Nest) con contrato versionado (`/v1`, solo cambios aditivos). Añadir un campo a la ficha de empresa pasa de "1 migración + 1 despliegue" a "3 equipos/3 despliegues".
- **9 scripts** (`seed-admin`, `seed-demo`, `import-dispositivos`, `import-partners-reales`, `migrar-partners-clientes`, `poblar-catalogos-marca`, `aplicar-tarifa-marcas`, …) usan Prisma: reescribirlos contra la API o pasarlos al equipo de MySQL.
- Si se cambia la collation a `_ci`, el email pasa a ser único sin distinguir mayúsculas (mejora), pero dos SKU que solo difieran en mayúsculas o acentos chocarían.

## 13. Impacto en tests

- Hoy: 26 ficheros, 164 tests (vitest) + 1 e2e. **10 ficheros mockean `PrismaService`** y comprueban la forma de las consultas (p. ej. que el `where` lleve `mode: 'insensitive'`, que se llame a `$transaction`). Esos tests se reescriben: pasan a mockear el repositorio (más simples y estables).
- Siguen igual: precio neto, periodos de estadísticas, textos de PDF, validadores de DTO, email, permisos.
- `codigo-pedido.spec.ts` y las garantías de concurrencia (doble confirmación, numeración, cambio de estado simultáneo) **dejan de poder probarse en Nest**: pasan a la API, que necesita su propia batería (pedir confirmación de que existirá).
- Nuevos: tests de contrato (OpenAPI/Pact) entre Nest y la API; tests del cliente HTTP (mapeo de errores, timeouts, qué se reintenta, cabeceras de idempotencia); un repositorio falso en memoria para desarrollo y e2e locales sin AWS; **snapshots del JSON** de cada endpoint de Nest para garantizar que el frontend no cambia; pruebas de carga y de arranque en frío en preproducción.

---

## 14. ¿Capa Repository/DataProvider manteniendo controllers, services y DTOs?

**Sí, y es la forma recomendada.** Cómo:

1. **Desacoplar tipos** (mecánico, sin cambiar comportamiento):
   - Enums propios en `src/dominio/enums.ts` con los mismos valores → cambiar imports en los ~36 ficheros que hoy tiran de `generated/prisma`.
   - `Decimal` desde `decimal.js` (es la misma librería que usa Prisma) → 7 ficheros.
   - Errores de dominio (`ErrorDuplicado(campo)`, `ErrorConcurrencia`, `ErrorNoEncontrado`, `ErrorIntegridad`) en lugar de `P2002/P2025/P2003` → 11 puntos.
2. **Un repositorio por dominio con métodos de negocio** (no genéricos), cuya firma coincide 1:1 con los endpoints de §6: `PedidosRepositorio.confirmar(...)`, `CarritoRepositorio.agregarLinea(...)`, `SesionRepositorio.estado(userId)`, etc. Inyectado por token con `useClass` según configuración (`DATA_PROVIDER_PEDIDOS=prisma|http`, por dominio).
3. **Implementación Prisma**: el código actual se mueve tal cual al repositorio (incluida la transacción de `confirmar` y la sincronización). Los tests deben seguir en verde: es un refactor puro.
4. **Implementación HTTP**: llamada al endpoint + mapeo de errores. Un `ClienteApiCorporativa` común (autenticación IAM/OAuth, timeouts, reintentos solo idempotentes, `Idempotency-Key`, `X-Request-Id`, circuit breaker).
5. **Lo que queda en los services**: validaciones, máquina de estados, emails, PDF, caché Redis, formateo de estadísticas. Los services con más lógica de datos (`confirmar`, sincronización, estadísticas) adelgazan porque esa lógica baja al repositorio/API.

Cuidado: varios services devuelven filas de Prisma directamente al controller (p. ej. `_count`). Los repositorios deben devolver tipos de salida explícitos que reproduzcan **exactamente** el JSON actual; para eso los snapshots de §13.

---

## 15. Clasificación por módulo

| Módulo / pieza | Ops Prisma | Clasificación | Motivo |
|---|---:|---|---|
| Frontend (Next.js) | 0 | **Sin cambios** | Si se respeta el JSON |
| Controllers (11), DTOs, guards, decoradores | 0 | **Sin cambios** | Solo cambia el import de enums en DTOs |
| `common/pdf`, `common/email`, `precio-neto`, `permisos-partner`, `redis` | 0 | **Sin cambios** | Solo imports de enums/Decimal |
| `users` | 0 | **Sin cambios** | Módulo vacío |
| `auth/jwt.strategy` | 1 | **Cambio pequeño** | + caché de sesión con invalidación |
| `partners/usuarios.service` | 8 | **Cambio pequeño** | Consultas simples |
| `productos.service` (catálogo cliente + productos base) | 15 | **Cambio pequeño** | Lecturas simples; `asignarMasivo` a la API |
| `imagenes.service` | 5 | **Cambio pequeño** | La API devuelve rutas huérfanas |
| `auth.service` | 26 | **Cambio medio** | 3 tx, tokens, transiciones de alta |
| `partners.service` | 27 | **Cambio medio** | 4 tx, bloqueo optimista, transiciones, sincronización |
| `carrito.service` | 15 | **Cambio medio** | Precios, bucle de repetir, idempotencia |
| `auditoria` (servicio + interceptor + filtro) | 1 | **Cambio medio** | Lotes / cola, eventos de negocio en la API |
| `pedidos.service` (confirmar, estados, listados) | 38 | **Reescritura importante** | Tx crítica, advisory lock, SQL raw, concurrencia |
| Estadísticas (en `pedidos.service`) | 10 | **Reescritura importante** (acceso a datos) | Agregación en la API; el formateo JS se queda |
| `catalogo-marca.service` | 18 + bucles | **Reescritura importante** | La sincronización tiene que vivir en la API |
| `prisma/` (servicio, esquema, 18 migraciones, `generated/`) | — | **Se sustituye** | |
| Scripts (9) | ~29 | **Reescritura importante** | O pasan al equipo de MySQL |
| Tests (10 de 26 ficheros) | — | **Cambio medio** | + contrato, snapshots, fakes |

---

## 16. Estimación de esfuerzo y riesgo

Jornadas de una persona con experiencia, rangos orientativos:

| Bloque | Jornadas |
|---|---:|
| Diseño del contrato OpenAPI (56 endpoints, errores, idempotencia) con el equipo de la API | 4–6 |
| Fase 0 en Nest: enums/Decimal/errores propios + repositorios con implementación Prisma (refactor puro) | 6–9 |
| Cliente HTTP + implementaciones HTTP de los repositorios | 10–15 |
| Caché de sesión, auditoría en lotes, idempotencia en Nest | 3–5 |
| Tests (reescritura de 10 specs, contrato, snapshots, fake en memoria) | 6–10 |
| **Subtotal NestJS** | **≈ 30–45** |
| API corporativa + Lambda: 56 endpoints, transacciones, numeración, sincronización, estadísticas, auditoría, tests de concurrencia | 35–60 |
| DDL MySQL + migración de datos + scripts | 7–12 |
| Preproducción: pruebas de carga y arranque en frío, corte, plan de vuelta atrás | 6–10 |
| **Total** | **≈ 80–130** (4–6,5 meses-persona) |

**Riesgo global: alto.** Principales riesgos:
1. Confirmación de pedido sin las garantías actuales (duplicados, numeración, precios) — impacto alto.
2. Latencia y arranques en frío en todas las páginas — impacto alto en la experiencia.
3. Dependencia de un equipo/sistema externo para cualquier cambio de datos — impacto alto en la velocidad de evolución del portal.
4. Disponibilidad encadenada: si cae API Gateway, la Lambda, la API o MySQL, nadie puede ni iniciar sesión (hoy solo depende de PostgreSQL).
5. Diferencias de MySQL (collation, fechas, UUID v1) que cambian comportamientos sin que nadie lo note.

---

## 17. Funcionalidades no viables o que pierden garantías

| # | Funcionalidad | Qué se pierde | ¿Se puede recuperar? |
|---|---|---|---|
| 1 | Transacciones que hoy abre Nest | No hay transacciones que abarquen varias llamadas HTTP | Solo si cada operación atómica es **un** endpoint. Con una API CRUD: **no viable** |
| 2 | Numeración `PED` sin huecos (`pg_advisory_xact_lock`) | El bloqueo es de PostgreSQL | Sí, en la API con tabla contador + `FOR UPDATE` |
| 3 | Revocación **inmediata** de sesión | Con caché: hasta 60 s si el cambio viene de fuera del portal | Sí, pagando una llamada por petición |
| 4 | Rendimiento de páginas y operaciones masivas | Latencia ×10–×30 por consulta; sincronización de catálogo inviable 1:1 | Con endpoints de negocio y caché |
| 5 | Concurrencia optimista (estado del pedido, ficha) | Escrituras perdidas si la API no admite condiciones | Sí, con `estadoEsperado`/`actualizadoEn` y `DATETIME(3)` |
| 6 | Integridad referencial y cascadas | Depende del esquema MySQL (si es el del ERP sin FKs, quedan huérfanos) | Sí, si el esquema mantiene las FKs |
| 7 | Mensajes de duplicado concretos (CIF, email, código de cliente) | Si la API devuelve un error genérico | Sí, con errores estructurados |
| 8 | Búsquedas insensibles a mayúsculas, regex, `date_trunc` semanal | Resultados distintos según collation/zona horaria | Sí, con SQL equivalente y UTC |
| 9 | Exportaciones/listados grandes | API Gateway corta a 29 s y Lambda limita la respuesta síncrona a 6 MB | Con paginación; hoy el volumen no llega |
| 10 | Disponibilidad | Cuatro sistemas en cadena | Parcial: timeouts, circuit breaker, mensajes claros |
| 11 | UUID v4 | `UUID()` de MySQL es v1 | Sí, generándolos en Nest/Lambda |
| 12 | Desarrollo local | Hoy basta Docker con PostgreSQL | Con el repositorio falso en memoria o un mock de la API |
| 13 | Pruebas de concurrencia propias | Pasan a depender del equipo de la API | Solo si la API tiene su batería |

Sin cambios (ya eran *best-effort* y se quedan en Nest): PDF y emails tras el commit, caché de estadísticas en Redis, ficheros de imágenes en el disco de Nest.

---

## 18. Arquitectura de transición con el menor cambio

```
Frontend (sin cambios)
   │  cookie fenster_session (sin cambios)
   ▼
NestJS
   Controllers · DTOs · Guards · PDF · Email           ← sin cambios
   Services (validación, máquina de estados, avisos)   ← cambio pequeño/medio
   Repositorios por dominio (interfaces = contrato §6)
      ├─ PrismaRepo  ──► PostgreSQL     (fase 0 y vuelta atrás)
      └─ HttpRepo    ──► ClienteApiCorporativa
                          (IAM/OAuth, timeouts, reintentos idempotentes,
                           Idempotency-Key, X-Request-Id, circuit breaker)
   Redis: caché de sesión (60 s, invalidación explícita), estadísticas, admins
   Auditoría: log JSON → CloudWatch; lotes → POST /v1/auditoria/eventos
   ▼
API Gateway (privada / IAM) → Lambda Manager (RDS Proxy) → API corporativa → MySQL
   (cada endpoint de negocio = 1 transacción MySQL con su auditoría)
```

Fases:
1. **Fase 0 — Refactor sin cambio de comportamiento** (solo Nest): tipos propios, errores de dominio, repositorios con implementación Prisma, snapshots del JSON. Se puede desplegar hoy mismo sin riesgo.
2. **Fase 1 — Contrato**: OpenAPI de los 56 endpoints derivado de las interfaces de los repositorios; el equipo de la API implementa contra ese contrato; Nest prueba contra un mock.
3. **Fase 2 — Activación por dominio** con interruptor de configuración, de menor a mayor riesgo: productos base y catálogo del cliente → usuarios → empresas → catálogos de marca → carrito → pedidos y estadísticas → sesión y login.
   - Mientras convivan, **no puede haber datos repartidos**: un dominio no se pasa a HTTP si otro que sigue en Prisma necesita sus tablas en la misma transacción (por eso carrito y pedidos van juntos, y sesión al final).
4. **Fase 3 — Corte**: con el volumen actual, una ventana de mantenimiento de pocas horas basta: congelar, migrar datos, verificar recuentos y sumas, activar HTTP en todos los dominios, pruebas de humo. Vuelta atrás: volver los interruptores a Prisma (solo es inmediata si aún no se ha escrito nada en MySQL).
5. **Fase 4 — Limpieza**: retirar Prisma, migraciones y `generated/`.

---

## 19. Riesgos ocultos detectados de paso

- `PedidosService.listarTodos` (`GET /pedidos/admin/todos`) devuelve todos los pedidos sin paginar y el frontend no lo usa: retirarlo.
- `aprobarPartner` lee el estado y luego actualiza sin condición (ventana pequeña de carrera); la API debería hacer la transición condicionada.
- `asignarMasivo` no captura un posible `P2002` si dos admins asignan a la vez.

## 20. Preguntas a resolver antes de decidir

1. **¿Por qué el cambio?** Si es para que pedidos y clientes lleguen al ERP/sistema corporativo, la alternativa de menor coste es **integración**: el portal mantiene su PostgreSQL y publica pedidos confirmados y altas a la API corporativa de forma asíncrona (patrón *outbox*, con reintentos). Coste estimado: 10–20 jornadas, sin pérdida de garantías.
2. **¿Quién construye la API corporativa y puede hacer endpoints a medida?** Si solo ofrece CRUD por tabla, la sustitución no es viable.
3. **¿El MySQL es una base nueva para el portal o las tablas existentes del ERP?** Si es el ERP, hay que añadir una capa de mapeo y revisar FKs, collation y formatos.
4. **¿Qué latencia y disponibilidad se aceptan?** Determina si hace falta *provisioned concurrency* en la Lambda (coste fijo) y si la revocación de sesión en 60 s es aceptable.
5. **¿Quién asume las pruebas de concurrencia** (doble confirmación, numeración) una vez que esa lógica está en la API?
