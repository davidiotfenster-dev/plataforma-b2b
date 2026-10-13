# Partners API v1: cuerpos de petición y parámetros de consulta

Hola Fran. El PDF del MOCK da ejemplo de 8 de las 28 acciones y varios están cortos. Aquí tienes el cuerpo completo de cada una y los parámetros de las consultas, sacados de lo que hace hoy el backend. Parto de los ejemplos del PDF y solo cambio lo que marco en la sección 9.

**Convenciones**
- Importes y porcentajes como texto decimal (`"1250.00"`). Fechas ISO 8601 UTC con milisegundos. Los ids nuevos los genera NestJS (UUID v4).
- `?` = opcional. En una edición, un campo ausente no cambia y `null` vacía el campo (solo los opcionales).
- **Nest valida el formato antes de llamar** (CIF, teléfonos, longitudes, emails). La API solo tiene que comprobar obligatorios, tipos y las reglas de datos que indico (duplicados, estados). Para lo demás, el formato de error del PDF §10.
- Las rutas con `[Idem]` llevan `Idempotency-Key`: #4, #11, #14, #18, #20, #22, #35, #13 `add` y `repeat-order`, #26 `assign` y #32 `apply-rate` con `simulate: false`.
- Cabeceras de actor (MOCK v1.4 §3): en `/admin/*` solo `X-Actor-User-Id` (el administrador de IoT FENSTER no tiene empresa); en las escrituras de `/companies/{companyId}/*`, `X-Actor-User-Id` y `X-Actor-Partner-Id`; `/auth/*`, `/audit/events` y `GET /legal-settings` no llevan cabeceras de actor. `X-Request-Id` va siempre.
- Errores: los códigos y su formato están en el PDF del MOCK v1.4 (§8 de la v1.3 más `JOB_ALREADY_RUNNING`); aquí no se repiten.
- Las reglas de cada operación (qué comprueba, qué efectos tiene) están en [REGLAS_DE_NEGOCIO_API.md](REGLAS_DE_NEGOCIO_API.md).

---

## 1. Autenticación y cuenta

### #4 `POST /auth/registrations` [Idem]
| Campo | Tipo | Obl. | Notas |
|---|---|:---:|---|
| `partnerId`, `userId` | uuid | ✔ | Los genera Nest |
| `razonSocial`, `cif`, `direccionFiscal`, `pais`, `dominioWeb` | texto | ✔ | |
| `email`, `nombre` | texto | ✔ | Del administrador de la empresa |
| `idioma` | `ES\|EN\|DE\|IT\|PT` | | Por defecto `ES` |
| `passwordHash` | texto | ✔ | bcrypt, lo calcula Nest |
| `tokenVerificacion`, `tokenVerificacionExpira` | texto, fecha | ✔ | |
| `condicionesAceptadasEn` | fecha | ✔ | Prueba de aceptación de las condiciones |

Respuesta: `{ partnerId, userId, estado: "PENDIENTE_VERIFICACION_EMAIL", email }` (como el MOCK).

### #5 `POST /auth/email-verification`
`{ userId, token }`. Respuesta: `{ verified, partner: { id, razonSocial, pais }, emailsAdmins: [] }`.

### #6 `POST /auth/password-reset`
`{ userId, token, passwordHash }`. Respuesta: `{ updated, sessionsInvalidated }`.

### #7 `POST /auth/users/{userId}/account`
| `action` | Campos | Notas |
|---|---|---|
| `invalidate-sessions` | ninguno | Guarda `sesionInvalidadaEn = ahora` |
| `set-language` | `idioma` | |
| `store-token` | `tipo`, `token`, `expiraEn` | `tipo`: `VERIFICACION_EMAIL` o `RESET_PASSWORD` (la invitación de un usuario nuevo usa `RESET_PASSWORD` con 7 días). La API guarda también cuándo se emitió: #3 lo devuelve como `ultimoPasswordResetEmitidoEn` |

Respuesta de las tres: `{ userId, email, idioma, action, updated }`.

---

## 2. Cliente (`/companies/{companyId}`)

### #11 `POST …/users` [Idem]
| Campo | Tipo | Obl. | Notas |
|---|---|:---:|---|
| `userId` | uuid | ✔ | |
| `email`, `nombre` | texto | ✔ | |
| `rol` | `PARTNER_ADMIN\|PARTNER_COMPRADOR\|PARTNER_CONSULTA` | ✔ | |
| `idioma` | idioma | | Por defecto `ES` |
| `passwordHash` | texto | ✔ | Hash de una contraseña aleatoria que nadie conoce; el usuario crea la suya con el enlace |
| `tokenInvitacion`, `tokenInvitacionExpiraEn` | texto, fecha | ✔ | Se guarda como token de restablecimiento |

### #13 `POST …/users/{userId}/cart/action`
| `action` | Campos | Notas |
|---|---|---|
| `add` [Idem] | `repId`, `cantidad` | `cantidad` de 1 a 100000 |
| `set-quantity` | `itemId`, `cantidad` | `itemId` es el id de la línea del carrito (el `items[].id` de #12) |
| `remove` | `itemId` | |
| `repeat-order` [Idem] | `orderId` | |

Todas devuelven el carrito completo. `repeat-order` añade además `agregadas`, `noDisponibles` (nombres) y `preciosCambiados` (`{ nombre, anterior, actual }`).

### #14 `POST …/orders` [Idem]
Igual que el PDF: `{ userId, direccionEnvio, poNumber, notas, totalEsperado }`. `notas` puede ser `null` o vacío. Respuesta: el pedido con sus líneas e historial, más `usuario { email, idioma }`, `razonSocial` y `emailsAdmins` (emails de los administradores de IoT FENSTER activos).

---

## 3. Administración: empresas

### #18 `POST /admin/companies` [Idem]
| Campo | Tipo | Obl. | Notas |
|---|---|:---:|---|
| `companyId` | uuid | ✔ | |
| `tipo` | `PARTNER\|DISTRIBUIDOR` | ✔ | Que solo un administrador cree `PARTNER` lo comprueba Nest |
| `marcaCatalogo` | `VBH\|PROCOMSA\|MYSMARTWINDOW` | ✔ | |
| Ficha | | | `razonSocial`, `cif`, `direccionFiscal`, `pais`, `dominioWeb` obligatorios. Opcionales: los de la sección «Ficha» abajo |
| `descuentoPorcentaje` | decimal | | Por defecto `"0.00"` |
| `usuario` | objeto | ✔ | `{ userId, email, nombre, passwordHash, idioma? }` |

El creador se toma de `X-Actor-User-Id` y se guarda como `creadoPorUsuarioId`.

**Ficha** (la usan #18 y #20; todos los de esta lista son opcionales salvo los marcados arriba): `codigoCliente`, `marcaComercial`, `tarifa`, `telefono1`, `telefono2`, `codigoPostal`, `localidad`, `provincia`, `direccionEnvioDefecto`, `codigoPostalEnvio`, `localidadEnvio`, `provinciaEnvio`, `paisEnvio`, `correoContacto1`, `correoContacto2`, `correoFacturacion`, `formaPago`, `divisa`, `iva` (decimal), `notas`.

Respuesta: `{ company, user, catalogSync }`.

### #20 `PUT /admin/companies/{id}` [Idem]
`{ expectedUpdatedAt, …campos de la ficha }`. Se pueden editar: `razonSocial`, `cif`, `direccionFiscal`, `pais`, `dominioWeb`, `marcaCatalogo`, `descuentoPorcentaje` y toda la ficha de arriba. **No** se editan aquí `estado`, `tipo` ni `archivadoEn` (van por #22). Respuesta: `{ company, catalogSync }`.

### #21 `DELETE /admin/companies/{id}`
`{ confirmarRazonSocial }`. Respuesta: `{ deleted: true }`.

### #22 `POST /admin/companies/{id}/transition` [Idem]
Todas llevan `{ action, expectedState, data? }`. `expectedState` es el estado actual de la empresa.

| `action` | `data` | Estado que se espera |
|---|---|---|
| `approve` | `{ marcaComercial, tarifa, descuentoPorcentaje, marcaCatalogo? }` | `PENDIENTE_APROBACION` |
| `reject` | | Cualquiera menos `ACTIVO` |
| `suspend` | | `ACTIVO` |
| `reactivate` | | `SUSPENDIDO` |
| `archive` | | El actual (no cambia) |
| `unarchive` | | El actual (no cambia) |
| `promote` | | `ACTIVO` |
| `demote` | | El actual (no cambia) |

Respuesta: `{ company, action, catalogSync, notify }`. `notify` es la lista `{ email, idioma }` de los usuarios con email verificado a quienes avisar (en `approve` y `reject`; vacía en el resto).

### #23 `PATCH /admin/users/{userId}/access`
`{ rol?, activo? }`: al menos uno. Respuesta: `{ id, rol, activo }`.

---

## 4. Catálogo de una empresa

### #26 `POST /admin/companies/{id}/catalog/action`
| `action` | Campos | Notas |
|---|---|---|
| `assign` [Idem] | `products: [{ productoBaseId, skuComercial, nombreComercial, pvpBase, descuentoOverride? }]` | Todo o nada |
| `update` | `repId`, `data: { skuComercial?, nombreComercial?, pvpBase?, descuentoOverride?, activo? }` | `descuentoOverride: null` lo quita. Si la fila viene del catálogo de la marca, solo se pueden cambiar `descuentoOverride` y `activo` |
| `remove` | `repId` | Solo productos extra (ver reglas) |
| `remove-extras` | ninguno | Borra todos los extra |

Respuesta: `{ success, companyId, action, affected, catalog }`.

---

## 5. Productos base

### #28 `POST /admin/products/action`
| `action` | Campos | Notas |
|---|---|---|
| `create` | `productId`, `data: { skuIndustrial, nombreTecnico, especificacionesJson?, pvpTarifa?, imagenUrl?, activo? }` | `skuIndustrial` único |
| `update` | `productId`, `data: { nombreTecnico?, activo?, especificacionesJson?, pvpTarifa?, imagenUrl? }` | |
| `bulk-assign` | `productId`, `data: { companyIds?, skuComercial, nombreComercial, pvpBase, descuentoOverride? }` | Sin `companyIds`: todas las empresas activas y no archivadas. Las que ya lo tienen se saltan |
| `set-image` | `productIds` (1 a 200), `imagenUrl` (texto o `null`) | `null` quita la foto |

`especificacionesJson` es un JSON libre (grupo, color, referencias por marca con GTIN…); la API lo guarda y lo devuelve **tal cual**.

Respuesta: `{ success, action, product? }`. `bulk-assign` añade `assigned` y `skipped`. `set-image` devuelve `orphanImages` (urls que ya no usa ningún producto ni empresa) y `updated` (cuántos productos).

---

## 6. Catálogo de marca

### #31 `POST /admin/brands/{brand}/catalog/action`
| `action` | Campos | Notas |
|---|---|---|
| `add` | `items: [{ productoBaseId, skuComercial, nombreComercial, pvpBase, documentacionUrl? }]` | El ejemplo del PDF (un producto suelto) equivale a un `items` de uno |
| `update` | `productoMarcaId`, `data: { skuComercial?, nombreComercial?, pvpBase?, documentacionUrl?, activo? }` | |
| `remove` | `productoMarcaId` | |

Respuesta: `{ success, brand, action, added?, removed?, empresasAfectadas?, sync }`. `sync` = `{ created, updated, removed, conflicts }`.

### #32 `POST /admin/brands/{brand}/jobs`
| `action` | Campos | Notas |
|---|---|---|
| `apply-rate` | `simulate` (bool, **obligatorio**) | **Sin porcentaje** (ver sección 9). `simulate: false` es [Idem] |

`fill` ya no existe en la API: lo calcula Nest y llega como #31 `add` con `items[]`; si llega a este endpoint, 422.

**Respuesta: 202 con el job** (asíncrono, MOCK v1.4 §4): `{ jobId, status: "QUEUED", brand, action, simulate, createdAt, result: null, error: null, statusUrl }`. Después, `GET /admin/brands/{brand}/jobs/{jobId}` devuelve el mismo objeto con `status` `QUEUED`, `RUNNING`, `DONE` o `FAILED`, y con `DONE`: `result: { processed, created, updated, removed, conflicts, changes }`, donde `changes` = `[{ skuComercial, antes, despues }]` (los precios que cambian, o cambiarían con `simulate: true`). Un segundo job real de la misma marca: 409 `JOB_ALREADY_RUNNING`.

---

## 7. Pedidos

### #35 `POST /admin/orders/{orderId}/transition` [Idem]
| Campo | Tipo | Obl. | Notas |
|---|---|:---:|---|
| `expectedState` | estado | ✔ | |
| `newState` | estado | ✔ | |
| `force` | bool | | Solo se guarda en la auditoría: **la máquina de estados la valida Nest** |
| `shipping` | `{ transportista, numeroExpedicion, trackingUrl }` | | Solo con `newState = ENVIADO` |
| `motivoCancelacion` | texto | | Solo con `newState = CANCELADO` |

Respuesta: `{ order, notify }`, con `notify: { email, idioma }` o `null` si el cambio ya estaba aplicado.

---

## 8. Auditoría

### #38 `POST /audit/events`
Igual que el PDF: `{ events: [{ eventId, timestamp, eventType, level, userId?, partnerId?, requestId, endpoint?, method?, statusCode? }] }`. Respuesta `{ accepted, duplicates }`; un `eventId` repetido cuenta como duplicado, no como error.

---

## 8b. Rutas auxiliares (MOCK v1.4)
- `GET /admin/brands/{brand}/jobs/{jobId}`: estado y resultado de un job de #32 (ver arriba). Solo `X-Request-Id`. Marca desconocida o job inexistente: 404.
- `GET /legal-settings` y `PUT /admin/legal-settings`: ajustes legales, 13 campos. Especificación completa, tabla y pruebas en [AJUSTES_LEGALES_API.md](AJUSTES_LEGALES_API.md). El PUT lleva `X-Request-Id` y `X-Actor-User-Id`, sin partner ni `Idempotency-Key`.

## 9. Qué cambio respecto a los ejemplos del PDF
| Ruta | PDF | Aquí | Por qué |
|---|---|---|---|
| #32 `apply-rate` | `data.ratePercent` | **Sin porcentaje** | Lo que hace hoy el sistema es copiar al catálogo de la marca el PVP de la tarifa oficial de cada producto, no subir un porcentaje |
| #28 `set-image` | `productId` | `productIds` (hasta 200) | Una misma foto se asigna a varios colores o marcas de golpe |
| #31 `add` | Un producto suelto | `items[]` | Se añaden varios a la vez |
| #13 `set-quantity`, `remove` | Sin campos | `itemId` | Es el id de línea que ya devuelve #12 |
| #26 `assign` | `productoBaseId`, `skuComercial` | Más `nombreComercial`, `pvpBase`, `descuentoOverride?` | Son obligatorios hoy |
| #22 `approve` | `marcaCatalogo`, `descuentoPorcentaje` | Más `marcaComercial` y `tarifa` | Se guardan al aprobar |
| #18 | 7 campos | Ficha completa y `usuario` | Hace falta el primer usuario |
| #4 | 6 campos | Más dirección fiscal, país, dominio, idioma, aceptación | El formulario ya los manda |
| #11 | Sin `passwordHash` | `passwordHash` | La columna es obligatoria |

---

## 10. Parámetros de las consultas (GET)

Todos opcionales. `page` empieza en 1; `limit` por defecto 20, máximo 100. Fechas `AAAA-MM-DD`, días completos en UTC, extremos incluidos.

| Ruta | Parámetros | Notas |
|---|---|---|
| #15 `…/orders` | `estado`, `desde`, `hasta`, `busqueda`, `orden` (`fecha\|total`, por defecto `fecha`), `sentido` (`asc\|desc`, por defecto `desc`) | `desde` > `hasta` → 422. `busqueda` no distingue mayúsculas y mira el código PED, el PO Number y el nombre o SKU de cualquier línea. Desempate por `id` |
| #17 `/admin/companies` | `estado`, `tipo`, `archivadas`, `busqueda`, `datosPorCompletar`, `createdBy`, `include=summary` | Por defecto solo no archivadas; `archivadas=true` solo las archivadas. `busqueda` mira razón social, CIF, dominio y código de cliente. Orden: más recientes primero |
| #19 `/admin/companies/{id}` | `createdBy` | Si la empresa no es de ese creador, 404 |
| #24 `…/audit` | `limit` | Por defecto 200; más recientes primero |
| #33 `/admin/orders` | `estado`, `busqueda`, `companyId`, `groupBy=company`, `createdBy` | La búsqueda mira código PED, PO Number y razón social. Con `groupBy=company` mira solo la razón social |
| #34 `/admin/orders/{id}` | `createdBy` | Igual que #19 |
| #36 `/admin/stats` | `desde`, `hasta`, `marca`, `partnerId`, `limite` | Por defecto, los últimos 30 días hasta hoy. Máximo 1098 días. `limite` recorta los rankings (en pantalla, 10) |
| #37 `/admin/stats/export` | `desde`, `hasta`, `marca`, `partnerId` | Rankings completos y una fila por pedido |

`createdBy` es el id de quien dio de alta la empresa: acota el resultado a las empresas de ese usuario (el rol comercial está apagado, pero se mantiene).
