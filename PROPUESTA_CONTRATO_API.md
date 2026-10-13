# Propuesta de contrato: API corporativa para la Plataforma B2B

Fecha: 2026-10-06 · Complementa a [ANALISIS_MIGRACION_API_MYSQL.md](ANALISIS_MIGRACION_API_MYSQL.md), que contiene el inventario completo (56 operaciones) del que sale esta propuesta.

```
Frontend Next.js ──► NestJS ──► API Gateway ──► Lambda Manager ──► API corporativa ──► MySQL
                     (único cliente de la API)
```

## 1. Resumen

**38 endpoints en 4 bloques.** Cubren las 56 operaciones de datos que hoy hace el backend, sin perder ninguna de las garantías de la base de datos actual.

| Bloque | Prefijo | Endpoints | Quién lo usa |
|---|---|---:|---|
| Autenticación y cuenta | `/v1/auth` | 7 | Login, sesión, registro, contraseñas |
| Cliente (todo lo de una empresa) | `/v1/companies/{companyId}` | 9 | Catálogo, carrito, pedidos y equipo de la empresa |
| Administración IoT FENSTER | `/v1/admin` | 21 | Empresas, catálogos, pedidos, estadísticas |
| Auditoría | `/v1/audit` | 1 | Registro de accesos en lotes |

Lo que **no cambia**: el frontend; los controllers, DTOs y guards de NestJS; la cookie y el JWT de sesión; bcrypt; la firma de tokens; los PDF y los emails; la caché de estadísticas; y los filtros de lo que ve el cliente (especificaciones públicas, id opaco de modelo).

---

## 2. Las reglas de diseño y por qué

**R1. Un endpoint por operación de negocio, nunca por tabla.**
Por qué: hoy 10 operaciones dependen de una transacción (confirmar pedido, cambiar estado, registro, alta de empresa…). Entre NestJS y MySQL hay tres saltos HTTP, así que una transacción no puede empezar en Nest y terminar dos llamadas después. Cada operación que hoy es atómica tiene que ser **una llamada** que la API ejecute dentro de una sola transacción MySQL.

**R2. Lo del cliente lleva siempre la empresa en la ruta (`/companies/{companyId}/…`); lo de administración va bajo `/admin`. Nada de parámetros `scope`.**
Por qué: el requisito número 1 del portal es que una empresa nunca vea datos de otra. Con la empresa en la ruta, el aislamiento depende de la forma de la URL, no de un parámetro que alguien puede olvidar o pasar mal. Además, a `/admin` se le puede dar una credencial o política IAM distinta y alarmas propias. Si un mismo endpoint sirviera al cliente y al admin según un parámetro, un fallo en ese parámetro enseñaría datos de todas las empresas.

**R3. Varias acciones en un mismo endpoint solo cuando comparten permiso, riesgo, duración y forma de reintentarse.**
Por qué: dentro de un endpoint "multiacción", API Gateway y CloudWatch ven una sola ruta. No se puede validar, medir, poner alarmas ni ajustar el timeout por acción, y el cliente HTTP no sabe qué acciones se pueden repetir sin mirar el cuerpo. Por eso se agrupan las acciones del carrito (rápidas, del mismo usuario, todas devuelven el carrito), pero no se mezcla "cambiar idioma" con "restablecer contraseña", ni "editar un precio" con "rellenar un catálogo entero".

**R4. Cada escritura devuelve lo que la pantalla necesita después.**
Por qué: cada viaje a la API cuesta 40–150 ms (o segundos si la Lambda arranca en frío), frente a 1–5 ms de una consulta local de hoy. Si añadir al carrito devuelve el carrito entero y confirmar el pedido devuelve todo lo necesario para el PDF y los emails, cada clic del usuario cuesta un solo viaje.

**R5. Los identificadores de lo que se crea los genera NestJS (UUID v4).**
Por qué: (a) si un alta se reintenta con el mismo id, la API sabe que es la misma y no da un falso "ya existe"; (b) Nest puede firmar el token de verificación o de invitación antes de llamar, así cada alta es una sola llamada; (c) la función `UUID()` de MySQL genera UUID v1 y el proyecto exige v4.

**R6. Las escrituras que no se pueden repetir llevan `Idempotency-Key`.**
Por qué: con HTTP aparecen reintentos (red, timeouts) y un caso nuevo: API Gateway corta la respuesta a los 29 s pero la Lambda sigue y confirma. Sin clave, un reintento duplica cantidades en el carrito o un pedido. Nest genera una clave por cada petición que recibe del navegador y la reutiliza en sus reintentos. La API guarda clave → respuesta durante 24 h.

**R7. Concurrencia explícita: el que escribe dice qué estado o versión esperaba.**
Por qué: hoy dos admins no pueden pisarse al cambiar el estado de un pedido (`where: {id, estado}`) ni al editar la misma ficha (`updatedAt`). Para mantenerlo, las escrituras llevan `expectedState` o `expectedUpdatedAt`, y la API responde 409 si ya no coincide.

**R8. Las reglas que solo miran el estado de una entidad se quedan en Nest; las que necesitan contar o mirar otras tablas en el mismo instante van en la API.**
Por qué: es lo que menos cambia el backend. La máquina de estados del pedido y las validaciones de cada transición de empresa siguen en Nest tal cual. Lo que necesita atomicidad con otros datos va en la API: "archivar solo sin pedidos en curso", "eliminar solo sin pedidos", "confirmar solo si los productos siguen disponibles".

**R9. Los precios los calcula siempre la API.**
Por qué: el precio que el cliente ve en el catálogo y en el carrito tiene que ser exactamente el que se congela al confirmar, y ese se calcula dentro de la transacción de la API. Si la fórmula viviera en dos sitios y en dos lenguajes, una diferencia de un céntimo en el redondeo haría saltar avisos falsos de "los precios han cambiado". Los casos de prueba de [precio-neto.spec.ts](backend/src/common/precio-neto.spec.ts) se entregan al equipo de la API como referencia.

**R10. Los eventos de auditoría de negocio se escriben en la misma transacción que el cambio.**
Por qué: hoy "si hay cambio, hay registro" está garantizado (pedido confirmado, cambio de estado, promoción, eliminación). La API recibe en cabeceras quién actúa y escribe el evento dentro de su transacción. El registro de accesos (uno por petición) va en lotes aparte (endpoint 38).

---

## 3. Convenciones comunes

**Cabeceras**

| Cabecera | Cuándo | Para qué |
|---|---|---|
| `X-Request-Id` | Siempre | Seguir una petición por Nest, API Gateway, Lambda y API |
| `X-Actor-User-Id`, `X-Actor-Partner-Id` | Escrituras | Quién actúa, para la auditoría de la API |
| `Idempotency-Key` | Escrituras marcadas **[Idem]** | Ver R6 |

**Autenticación de NestJS ante la API:** API privada (VPC endpoint) o IAM (SigV4). Nunca expuesta a internet.

**Formatos:** importes y porcentajes como texto decimal (`"1250.00"`, `"15.00"`); fechas ISO 8601 en UTC con milisegundos (`2026-10-06T09:15:02.123Z`, necesario para el bloqueo optimista); ids UUID v4; los emails y tokens viajan siempre en el cuerpo, nunca en la URL, porque API Gateway registra las URLs.

**Paginación:** `?page=1&limit=20` (máx. 100) → `{ "items": [...], "total": 0, "page": 1, "limit": 20 }`.

**Errores:** código HTTP + cuerpo `{ "codigo": "...", "mensaje": "...", "campo": "..." }`. NestJS los traduce a los mismos mensajes que ve hoy el usuario.

| HTTP | `codigo` | Ejemplo |
|---|---|---|
| 404 | `NO_ENCONTRADO` | No existe **o es de otra empresa** (siempre la misma respuesta) |
| 409 | `DUPLICADO` + `campo` (`cif`, `email`, `codigoCliente`, `skuComercial`) | Alta con CIF ya registrado |
| 409 | `CONFLICTO_ESTADO` | El pedido ya no está en el estado esperado |
| 409 | `CONFLICTO_VERSION` | Otra persona guardó la ficha antes |
| 409 | `PRECIOS_CAMBIADOS` | El total esperado no coincide |
| 409 | `PRODUCTOS_NO_DISPONIBLES` + lista | Productos retirados en el carrito |
| 409 | `CARRITO_YA_CONFIRMADO` | Doble clic en confirmar |
| 409 | `TIENE_PEDIDOS` | Eliminar o archivar con pedidos que lo impiden |
| 422 | `VALIDACION` + `campo` | Dato con formato incorrecto |

**Reintentos desde NestJS:** solo en lecturas y en escrituras con `Idempotency-Key`. Timeout de 5 s (15 s en confirmar pedido y procesos masivos).

---

## 4. Bloque 1 — Autenticación y cuenta (7)

| # | Endpoint | Qué hace | Sustituye en Nest |
|---|---|---|---|
| 1 | `POST /v1/auth/login-context` | Por email: id, hash de la contraseña, rol, activo, email verificado, estado de la empresa y si está archivada | `validarCredenciales` |
| 2 | `GET /v1/auth/session/{userId}?profile=true` | Estado de sesión (activo, sesiones invalidadas desde, rol, empresa y su estado) y, con `profile`, el perfil de `/auth/me` | `JwtStrategy.validate`, `obtenerPerfil` |
| 3 | `POST /v1/auth/account-lookup` | Por email, **sin hash**: id, idioma, activo, verificado, estado de la empresa, cuándo se emitió el último enlace de contraseña | `reenviarVerificacion`, `olvidePassword` |
| 4 | `POST /v1/auth/registrations` **[Idem]** | Registro público: empresa pendiente de verificar + usuario administrador inactivo + token de verificación, todo en una transacción | `registrarPartner` |
| 5 | `POST /v1/auth/email-verification` | Comprueba el token, marca el email verificado y pasa la empresa a pendiente de aprobación. Devuelve la empresa y los emails de los admins de IoT FENSTER | `verificarEmail`, `avisarNuevaSolicitud` |
| 6 | `POST /v1/auth/password-reset` | Cambia la contraseña solo si el token coincide y no ha caducado; consume el token e invalida las sesiones abiertas | `resetearPassword` |
| 7 | `POST /v1/auth/users/{userId}/account` | Mantenimiento de cuenta: `invalidate-sessions`, `set-language`, `store-token` (verificación, reset o invitación). Devuelve email e idioma para el correo | `cerrarSesion`, `forzarLogout`, `actualizarIdioma`, guardado de tokens, `dispararResetPassword` |

**Por qué así**
- **Login y sesión, separados**: el login necesita el hash una sola vez; la sesión se consulta continuamente y nunca debe llevar el hash.
- **`account-lookup` aparte del login**: "olvidé mi contraseña" no tiene por qué hacer viajar el hash de la contraseña.
- **Verificación de email y cambio de contraseña, cada uno con su ruta**: consumen un secreto y cambian el estado de la cuenta. Necesitan validación propia y una alarma propia (un pico de cambios de contraseña es señal de ataque).
- **El endpoint 7 agrupa tres acciones** porque las tres fijan un valor (repetirlas no hace daño), son instantáneas y tienen el mismo permiso.
- **La sesión (2) la cachea Nest 60 s en Redis**, y la invalida al instante cuando el cambio se hace desde el portal (cerrar sesión, desactivar, cambiar rol, suspender empresa). Si se hace desde otro sistema corporativo, tarda como mucho 60 s en aplicarse.
- **bcrypt y la firma de tokens siguen en Nest**: cero cambios en esa lógica.

Ejemplo, endpoint 2:
```json
GET /v1/auth/session/0b1c…?profile=true
{
  "activo": true,
  "sesionInvalidadaEn": null,
  "rol": "PARTNER_COMPRADOR",
  "partnerId": "9f2e…",
  "partner": { "estado": "ACTIVO", "archivadoEn": null },
  "perfil": {
    "email": "ana@empresa.es", "nombre": "Ana", "idioma": "ES",
    "partner": { "razonSocial": "Empresa SL", "marcaComercial": "…", "direccionEnvio": "C/ …\n28001 Madrid\nMadrid España" }
  }
}
```

---

## 5. Bloque 2 — Cliente: todo bajo `/v1/companies/{companyId}` (9)

| # | Endpoint | Qué hace | Sustituye en Nest |
|---|---|---|---|
| 8 | `GET …/catalog` | Productos visibles de la empresa con PVP, descuento aplicado y precio neto ya calculados | `listarCatalogo` |
| 9 | `GET …/catalog/{repId}` | Un producto; 404 si no es de esa empresa o ya no está a la venta | `obtenerRepresentacion` |
| 10 | `GET …/users` | Usuarios de la empresa | `listarPorPartner` (pantalla Equipo y admin) |
| 11 | `POST …/users` **[Idem]** | Alta de usuario con su token de invitación; comprueba que la empresa está activa y que el email no existe (sin distinguir mayúsculas) | `UsuariosService.crear`, `invitarUsuario` |
| 12 | `GET …/users/{userId}/cart` | Carrito (se crea si no existe) con líneas, precios vigentes, disponibilidad y total | `obtenerResumen` |
| 13 | `POST …/users/{userId}/cart/action` | `add` **[Idem]**, `set-quantity`, `remove`, `repeat-order` **[Idem]**. Siempre devuelve el carrito completo | `agregarItem`, `actualizarCantidad`, `eliminarItem`, `repetirPedido` |
| 14 | `POST …/orders` **[Idem]** | **Confirmar pedido** en una transacción | `confirmar`, `avisarPedidoNuevo` |
| 15 | `GET …/orders?estado&desde&hasta&busqueda&orden&sentido&page&limit` | Mis pedidos + resumen por estado + enviados en los últimos 7 días | `listar` |
| 16 | `GET …/orders/{orderId}` | Detalle con líneas, fotos, historial de estados y razón social (sirve para la pantalla y para el PDF) | `obtener`, `generarPdf` |

**Por qué así**
- **La empresa en la ruta** hace que ninguna de estas 9 rutas pueda devolver datos de otra empresa. La API filtra siempre por `companyId` en la propia consulta y responde 404 igual exista o no el recurso, como hoy.
- **Los usuarios cuelgan de la empresa** porque el administrador de la empresa (pantalla Equipo) y el admin de IoT FENSTER hacen exactamente la misma operación: una sola ruta para los dos.
- **El carrito agrupa sus 4 acciones**: mismo usuario, mismo permiso, rápidas, y todas devuelven lo mismo. `add` y `repeat-order` suman cantidades, por eso llevan clave de idempotencia.
- **Confirmar pedido no se mezcla con nada**: es la operación más crítica del sistema.
- **El catálogo devuelve también el nombre técnico y las especificaciones internas, pero solo a Nest**: Nest sigue aplicando sin cambios la lista blanca de especificaciones y el id opaco de modelo ([especificaciones-partner.ts](backend/src/productos/especificaciones-partner.ts)), así que al navegador solo llega lo de hoy.

**Endpoint 14 — confirmar pedido (el más importante)**
```json
POST /v1/companies/9f2e…/orders
Idempotency-Key: 5c0a…
{
  "userId": "0b1c…",
  "direccionEnvio": "C/ …",
  "poNumber": "PO-2026-118",
  "notas": null,
  "totalEsperado": "1250.00"
}
```
Lo que hace la API, todo en **una** transacción MySQL:
1. Lee el carrito del usuario en esa empresa con sus productos.
2. Si alguno ya no está a la venta → 409 `PRODUCTOS_NO_DISPONIBLES` con la lista.
3. Calcula el precio de cada línea (descuento del producto o, si no tiene, el general de la empresa) y el total.
4. Si no coincide con `totalEsperado` → 409 `PRECIOS_CAMBIADOS`.
5. Borra las líneas del carrito; si alguna ya no estaba (otra confirmación simultánea) → 409 `CARRITO_YA_CONFIRMADO`.
6. Saca el siguiente `PED-xxxxxx` de una tabla contador con `SELECT … FOR UPDATE`: sin huecos y sin choques, igual que el bloqueo actual de PostgreSQL.
7. Crea el pedido, sus líneas con la "fotografía" de precios y el historial en RECIBIDO.
8. Escribe el evento `PEDIDO_CONFIRMADO` en la auditoría.
9. COMMIT.

Respuesta: el pedido con sus líneas, más `usuario {email, idioma}`, `razonSocial` y `emailsAdmins`. Con eso Nest genera el PDF y manda los emails **sin otra llamada**, como hoy (después del commit y sin poder romper el pedido).

Cómo quedan cubiertos los dos riesgos de duplicado:
- **Doble clic o dos pestañas**: el paso 5, igual que hoy.
- **Se pierde la respuesta entre Nest y la API**: Nest reintenta con la misma `Idempotency-Key` y recibe el mismo pedido, en lugar de un error.

---

## 6. Bloque 3 — Administración IoT FENSTER: todo bajo `/v1/admin` (21)

El parámetro `createdBy` acota los resultados a las empresas que dio de alta un comercial. El rol está apagado, pero se mantiene para no tener que cambiar el contrato al reactivarlo.

**Empresas (6)**

| # | Endpoint | Qué hace | Sustituye en Nest |
|---|---|---|---|
| 17 | `GET /v1/admin/companies?estado&tipo&archivadas&busqueda&datosPorCompletar&page&limit&createdBy&include=summary` | Listado con contadores (usuarios, productos, pedidos) y, con `include=summary`, el resumen por estado de las pestañas | `listar`, `resumen` |
| 18 | `POST /v1/admin/companies` **[Idem]** | Alta directa: empresa activa + primer usuario + catálogo de su marca, en una transacción | `crear`, `sincronizarEmpresa` |
| 19 | `GET /v1/admin/companies/{id}?createdBy` | Ficha + contadores + volumen de compras | `obtener`, `volumenCompras` |
| 20 | `PUT /v1/admin/companies/{id}` **[Idem]** | Guardar la ficha con `expectedUpdatedAt`; si cambia la marca, resincroniza su catálogo en la misma transacción | `actualizar` |
| 21 | `DELETE /v1/admin/companies/{id}` | Eliminar definitivamente, solo sin pedidos; auditoría y borrado en cascada atómicos | `eliminar` |
| 22 | `POST /v1/admin/companies/{id}/transition` **[Idem]** | `approve`, `reject`, `suspend`, `reactivate`, `archive`, `unarchive`, `promote`, `demote`, con `expectedState`. Devuelve la empresa, el resultado de la sincronización de catálogo y a quién avisar por email | `aprobarPartner`, `rechazarPartner`, `suspender`, `reactivar`, `archivar`, `desarchivar`, `promocionar`, `degradar` |

**Usuarios (2)**

| # | Endpoint | Qué hace | Sustituye en Nest |
|---|---|---|---|
| 23 | `PATCH /v1/admin/users/{userId}/access` | Cambiar rol y/o activar o desactivar | `cambiarRol`, `activar`, `desactivar` |
| 24 | `GET /v1/admin/users/{userId}/audit?limit=200` | Últimos eventos de auditoría del usuario | `UsuariosService.auditoria` |

**Catálogo de una empresa (2)**

| # | Endpoint | Qué hace | Sustituye en Nest |
|---|---|---|---|
| 25 | `GET /v1/admin/companies/{id}/catalog` | Todo su catálogo, también lo oculto | `PartnersService.listarCatalogo` |
| 26 | `POST /v1/admin/companies/{id}/catalog/action` | `assign` **[Idem]** (varios productos, todo o nada), `update`, `remove`, `remove-extras` | `asignarProductos`, `actualizarRepresentacion`, `eliminarRepresentacion`, `eliminarTodasLasRepresentaciones` |

**Productos base (3)**

| # | Endpoint | Qué hace | Sustituye en Nest |
|---|---|---|---|
| 27 | `GET /v1/admin/products` | Catálogo global con cuántas empresas tiene cada producto | `listarBase` |
| 28 | `POST /v1/admin/products/action` | `create`, `update`, `bulk-assign`, `set-image` (devuelve qué fotos han quedado sin uso para que Nest las borre del disco) | `crearBase`, `actualizarBase`, `asignarMasivo`, `imagenes.asignar/quitar/limpiar` |
| 29 | `GET /v1/admin/products/{id}/companies` | Qué empresas tienen el producto y con qué nombre y precio | `listarRepresentacionesDeBase` |

**Catálogos de marca (3)**

| # | Endpoint | Qué hace | Sustituye en Nest |
|---|---|---|---|
| 30 | `GET /v1/admin/brands/{brand}/catalog` | Productos de la marca + cuántos partners y distribuidores la usan | `CatalogoMarcaService.listar` |
| 31 | `POST /v1/admin/brands/{brand}/catalog/action` | `add`, `update`, `remove`. Cada una sincroniza **dentro de la API** las empresas de la marca y devuelve el resultado (creados, actualizados, retirados, conflictos) | `anadir`, `actualizar`, `eliminar`, `sincronizarMarca` |
| 32 | `POST /v1/admin/brands/{brand}/jobs` | Procesos masivos: `fill` (rellenar con todo lo que falta) y `apply-rate` (con modo simulación) | `rellenar`, `aplicarTarifa` |

**Pedidos (3)**

| # | Endpoint | Qué hace | Sustituye en Nest |
|---|---|---|---|
| 33 | `GET /v1/admin/orders?estado&busqueda&companyId&groupBy=company&page&limit&createdBy` | Lista plana, agrupada por empresa (con pendientes) o los de una empresa | `listarTodosAdmin`, `resumenPorPartner`, `listarPorPartnerAdmin` |
| 34 | `GET /v1/admin/orders/{orderId}?createdBy` | Detalle con quién lo hizo, historial y datos para el PDF | `obtenerAdmin`, `generarPdfAdmin` |
| 35 | `POST /v1/admin/orders/{orderId}/transition` **[Idem]** | Cambio de estado condicionado a `expectedState`, con datos de envío o motivo de cancelación, historial y auditoría. Devuelve a quién avisar **solo si el cambio se aplicó en esta llamada** | `actualizarEstado` |

**Estadísticas (2)**

| # | Endpoint | Qué hace | Sustituye en Nest |
|---|---|---|---|
| 36 | `GET /v1/admin/stats?desde&hasta&granularidad&marca&partnerId&limite` | Todo el bloque agregado en una llamada (KPIs, periodo anterior, serie, por estado, por empresa, por producto, empresas del filtro) | `calcularEstadisticas` (9 consultas) |
| 37 | `GET /v1/admin/stats/export?desde&hasta&marca&partnerId` | Rankings completos + una fila por pedido del periodo, para el Excel | `exportarEstadisticas` |

**Por qué así**
- **`/admin` aparte**: se le puede dar una credencial o política IAM distinta y alarmas propias, y es imposible servir por error una vista de administración a un cliente.
- **Las 8 transiciones de empresa en un endpoint**: mismo permiso, misma forma (comprobar estado, cambiarlo, efectos, auditoría) y cortas. Es el caso de libro de "agrupar".
- **La ficha (20) va aparte de las transiciones**: es una edición con bloqueo optimista, no un cambio de estado. Si se mezclaran, el reintento de un "guardar" podría confundirse con una transición.
- **Eliminar (21) va aparte**: es irreversible y merece permiso y alarma propios.
- **Los procesos masivos de marca (32) van aparte de las ediciones (31)**: rellenar un catálogo son cientos de escrituras (unas 810 con 13 empresas y 58 productos). Separados se les puede dar otro timeout o pasarlos a asíncronos (respuesta 202 + consulta del resultado) sin tocar nada más.
- **Las vistas resumidas son una opción de consulta** (`include=summary`, `groupBy=company`) y no rutas propias: son los mismos datos con el mismo permiso, solo cambia el agrupado. Aquí no hay riesgo de mezclar empresas, que es lo que justifica separar rutas en el bloque del cliente.
- **Estadísticas en una sola llamada**: hoy son 9 consultas; en HTTP serían 9 viajes. La caché de 120 s en Redis se queda en Nest.
- **Transiciones (22 y 35) con `expectedState`**: Nest lee primero la ficha o el pedido, valida con las mismas reglas de hoy (la máquina de estados no se toca) y manda el estado que esperaba. Son 2 llamadas por clic, aceptable en acciones de admin, y a cambio el backend no cambia. Si el equipo de la API prefiere absorber esas reglas, se ahorra la lectura previa sin cambiar el contrato.

**Endpoint 35 — cambiar estado de un pedido**
```json
POST /v1/admin/orders/7d41…/transition
Idempotency-Key: 21ef…
{
  "expectedState": "PREPARADO",
  "newState": "ENVIADO",
  "force": false,
  "shipping": { "transportista": "SEUR", "numeroExpedicion": "123456", "trackingUrl": "https://…" }
}
```
La API, en una transacción: actualiza solo si sigue en `PREPARADO` (si no, 409 `CONFLICTO_ESTADO`), limpia los datos que ya no aplican (motivo de cancelación, datos de envío al salir de ENVIADO), añade el historial y escribe `PEDIDO_ESTADO_ACTUALIZADO`. Responde con el pedido y `notificar: {email, idioma}`, o `notificar: null` si era un reintento de algo ya aplicado: así el cliente no recibe el email dos veces.

---

## 7. Bloque 4 — Auditoría (1)

| # | Endpoint | Qué hace |
|---|---|---|
| 38 | `POST /v1/audit/events` | Lote de eventos de acceso y seguridad (login correcto o fallido, 401, 403, accesos a recursos), cada uno con su `eventId` para no duplicar |

**Por qué así**
- Hoy se escribe un registro por cada petición. Con HTTP eso duplicaría las llamadas, así que Nest acumula y envía cada pocos segundos o cada N eventos.
- El log JSON completo sigue saliendo por el log de Nest hacia CloudWatch.
- Los eventos de negocio no pasan por aquí: los escribe la API en su transacción (R10).
- Recomendación: que el usuario MySQL de la API solo pueda **insertar** en la tabla de auditoría, nunca modificar ni borrar.

---

## 8. Frente a la propuesta de 20 endpoints

| Tema | Propuesta de 20 | Esta propuesta | Por qué |
|---|---|---|---|
| Datos de cliente y de admin | Misma ruta con `scope` | Rutas distintas; la empresa va en la ruta | Un fallo en un parámetro no puede mezclar datos de empresas |
| Autenticación | Un `/auth/action` con 6 acciones | 7 rutas; solo se agrupan las 3 triviales | Cambiar contraseña y verificar email consumen un secreto: validación y alarmas propias |
| Catálogo | Un GET y un `/action` para todo | 11 rutas según el tipo de catálogo | Cada catálogo enseña cosas distintas a gente distinta; los procesos masivos necesitan otro timeout |
| Ficha de empresa, eliminar empresa, registro público, auditoría por usuario, pedidos agrupados por empresa, empresas de un producto | No están | Incluidos | Existen hoy y el frontend los usa |
| Carrito, confirmar pedido, transición de pedido, estadísticas, auditoría en lotes | Bien planteados | Igual, con la empresa en la ruta | Coincidimos |
| Trabajo en la API | ~56 operaciones dentro de varios `switch` | ~56 operaciones en 38 rutas | El esfuerzo es el mismo: cambia cómo se organiza, no cuánto hay que hacer. API Gateway cobra por petición, no por ruta |

---

## 9. Llamadas por pantalla con este contrato

Con la sesión en caché y la auditoría en lotes:

| Pantalla o acción | Hoy (consultas a BD) | Con este contrato (llamadas HTTP) |
|---|---:|---:|
| Catálogo | 12 | 3 |
| Carrito / checkout | 8 | 2 |
| Añadir al carrito | 9 | 1 |
| Confirmar pedido | 10 | 1 |
| Mis pedidos | 14 | 3 |
| Dashboard de estadísticas | 14 | 2 (1 con caché) |
| Listado de empresas | 16 | 4 |
| Dar de alta una empresa / aprobarla | ≈ 68 | 1 / 2 |
| Cambiar estado de un pedido | 6 | 2 |
| Rellenar un catálogo de marca | ≈ 810 | 1 |

---

## 10. Qué pasa a la API y qué se queda en NestJS

| Se queda en NestJS (sin cambios o casi) | Pasa a la API corporativa |
|---|---|
| Cookie y JWT de sesión, bcrypt, firma de tokens | Transacciones: confirmar pedido, registro, altas, transiciones, eliminar |
| Guards, roles, `PARTNER_CONSULTA` solo lectura, 404 opaco | Numeración `PED` sin huecos (tabla contador) |
| Máquina de estados del pedido y validaciones de cada transición | Cálculo de precios (catálogo, carrito y pedido) |
| Lista blanca de especificaciones e id opaco de modelo | Regla de "producto visible" |
| PDF, emails, plantillas, idiomas | Sincronización de catálogos de marca |
| Caché Redis de estadísticas y de sesión | Agregados de estadísticas |
| Ficheros de imágenes en disco | Comprobaciones con otras tablas (pedidos en curso, email único) |
| Formato JSON que recibe el frontend | Auditoría de negocio dentro de cada transacción |

---

## 11. Decisiones para cerrar con el equipo de la API

1. **Autenticación de NestJS ante la API**: IAM (SigV4) o API privada con VPC endpoint.
2. **Contraseñas**: la propuesta mantiene bcrypt en Nest (la API devuelve el hash en el endpoint 1). Hay que confirmar que API Gateway y la Lambda **no registran cuerpos de respuesta**.
3. **Esquema MySQL**: si es una base nueva, se replica el modelo actual (FKs, cascadas, `DATETIME(3)`, collation). Si son tablas del ERP, hace falta una capa de mapeo.
4. **Procesos masivos (32)**: síncronos con timeout largo de momento; asíncronos (202) si el catálogo crece.
5. **Pruebas de concurrencia en la API**: doble confirmación, numeración con pedidos simultáneos, dos admins cambiando el mismo pedido.
6. **Versionado**: `/v1` solo admite cambios que añaden; lo que rompa va en `/v2` y conviven hasta que Nest migre.
