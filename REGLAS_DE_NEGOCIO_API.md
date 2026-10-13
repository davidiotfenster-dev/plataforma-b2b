# Partners API v1: reglas de negocio que pasan a la API

Hola Fran. Estas son las reglas que hoy cumple el backend y que, con el contrato de 38 rutas, pasan a ser código tuyo. Están sacadas del código actual, no de memoria. Los cuerpos de cada acción están en [CUERPOS_DE_ACCIONES_API.md](CUERPOS_DE_ACCIONES_API.md).

**Qué hace cada lado**
- **La API:** todo lo que necesita una transacción o mirar varias tablas a la vez: precios, confirmar pedido, numeración, estados y efectos de las empresas, sincronización de catálogos de marca, estadísticas, auditoría de negocio. Y los datos que guarda: también los ajustes legales (`/legal-settings`, especificados campo a campo en [AJUSTES_LEGALES_API.md](AJUSTES_LEGALES_API.md)).
- **NestJS (no lo programes):** bcrypt y firma de tokens, validación del formato de los datos, la máquina de estados del pedido, permisos por rol, PDF y emails, lista blanca de especificaciones que ve el cliente, caché.

**Valores y tipos:** UUID v4 en todas las tablas; importes `DECIMAL(12,2)`; porcentajes e IVA `DECIMAL(5,2)`; fechas `DATETIME(3)` en UTC. El email y el CIF son únicos; el email se compara **sin distinguir mayúsculas** (collation `_ci`).

---

## 1. Precio neto (la regla más delicada)

```
precioNeto = ROUND( pvpBase × (100 − descuento) / 100 , 2 )     — decimal exacto, redondeo medio hacia arriba
totalLinea = precioNeto × cantidad
totalPedido = suma de totalLinea
descuento = descuentoOverride de la línea, o si es NULL, el descuento general de la empresa
```

- **Nunca con coma flotante.** Con `DECIMAL`, `pvpBase × (100 − descuento)` es exacto y dividir entre 100 no pierde decimales.
- El **precio unitario se redondea antes de multiplicar por la cantidad** (no se redondea el total).
- La misma fórmula en catálogo (#8, #9), carrito (#12, #13) y pedido (#14). Si difiere en un céntimo, la web avisa de «los precios han cambiado».
- El pedido **congela** `pvpHistorico`, `descuentoAplicado`, `precioNetoUnitario` y `totalLinea`: nunca se recalculan.

**Casos de prueba** (PVP, descuento → precio neto), verificados con el código actual:

| PVP | Descuento % | Precio neto |
|---:|---:|---:|
| 98.00 | 50 | 49.00 |
| 82.00 | 10 | 73.80 |
| 20.00 | 0 | 20.00 |
| 20.00 | 100 | 0.00 |
| 33.33 | 7.5 | 30.83 |
| 10.05 | 10 | **9.05** (9.045 redondea hacia arriba) |
| 0.01 | 50 | **0.01** (0.005 redondea hacia arriba) |
| 99.99 | 15 | 84.99 |
| 120.00 | 15 | 102.00 |
| 102.50 | 12.5 | 89.69 |
| 49.00 | 33.33 | 32.67 |
| 135.00 | 22.5 | **104.63** (104.625 redondea hacia arriba) |

---

## 2. Producto visible

Un producto de una empresa **se ve y se puede pedir** solo si se cumplen las tres:
1. `RepresentacionPartner.activo = true`
2. `ProductoBase.activo = true`
3. Si viene de un catálogo de marca (`productoMarcaId` no nulo), `ProductoMarca.activo = true`

- Catálogo (#8) y ficha (#9) solo devuelven productos visibles. Ficha de uno no visible o de otra empresa: **404**.
- Añadir al carrito (#13 `add`) exige producto visible y de esa empresa; si no, 404.
- Una línea ya en el carrito que deja de ser visible **no se borra**: se devuelve con `disponible: false`.
- Imagen del producto: la de la empresa si tiene; si no, la del producto base.
- El catálogo (#8) devuelve por producto: `id`, `skuComercial`, `nombreComercial`, `nombreTecnico`, `imagenUrl`, `documentacionUrl`, `pvpBase`, `descuentoAplicado`, `precioNeto`, `activo` y `especificacionesJson` del producto base. Orden: `nombreComercial` ascendente. Nest filtra lo que ve el navegador.

---

## 3. Carrito

- Un carrito por usuario y empresa; se crea al consultarlo la primera vez (#12).
- **No se cachea**: cada consulta lee precios y descuentos vigentes.
- `add` suma a la línea si ya existe, en una sola operación atómica (dos «añadir» simultáneos suman los dos). La cantidad de una línea no puede pasar de **100000**; si pasaría, 422 `VALIDACION` con `campo: "cantidad"` y no se toca nada.
- `set-quantity` y `remove`: la línea tiene que ser del carrito de ese usuario en esa empresa; si no, 404.
- `repeat-order`: el pedido tiene que ser de esa empresa (404 si no). Para cada línea del pedido:
  - Si su producto sigue visible (usa `OrderItem.representacionPartnerId`, que puede ser nulo): suma la cantidad a la línea del carrito (con tope 100000).
  - Si no: no la añade y pone su nombre en `noDisponibles`.
  - Después compara el **precio neto actual** con el pagado en el pedido: si difiere, lo añade a `preciosCambiados` con `anterior` y `actual`.
  - Usa siempre el precio **vigente**, nunca el histórico.

---

## 4. Confirmar pedido (#14), todo en una transacción

1. Lee el carrito del usuario en esa empresa. Si no existe o está vacío: **422** `VALIDACION`.
2. Si alguna línea no es visible: **409** `PRODUCTOS_NO_DISPONIBLES` con la lista de nombres.
3. Calcula cada línea y el total (sección 1).
4. Si `totalEsperado` no es igual al total calculado: **409** `PRECIOS_CAMBIADOS`.
5. Borra las líneas del carrito. Si alguna ya no estaba (otra confirmación simultánea): **409** `CARRITO_YA_CONFIRMADO`. Hay que borrar **antes** de crear el pedido y comprobar cuántas filas se borraron.
6. Saca el siguiente `PED-xxxxxx`.
7. Crea el pedido (estado `RECIBIDO`), sus líneas con la fotografía de precios y la primera fila de historial.
8. Escribe la auditoría `PEDIDO_CONFIRMADO` (payload `{ codigoPed, totalNeto }`).
9. COMMIT. Devuelve el pedido con sus líneas, `usuario { email, idioma }`, `razonSocial` y `emailsAdmins`.

**Numeración:** `PED-` + número de 6 cifras con ceros (`PED-000123`). Siguiente = **el mayor existente + 1**, sin huecos: si la transacción falla, no se gasta número. Dos confirmaciones simultáneas no pueden sacar el mismo (bloqueo `FOR UPDATE` sobre una tabla contador). `codigoPed` es único. **Al cargar los datos reales, el contador tiene que continuar desde el último `PED` existente.**

---

## 5. Cambiar el estado de un pedido (#35)

**Nest ya validó la transición** con la máquina de estados (avanzar un paso o `force`, no cancelar un `ENVIADO`, etc.). La API solo hace esto, en una transacción:

1. Actualiza **solo si el estado actual es `expectedState`**; si no, **409** `CONFLICTO_ESTADO`.
2. Con `newState = ENVIADO` guarda `transportista`, `numeroExpedicion` y `trackingUrl`. Con `CANCELADO`, `motivoCancelacion`.
3. **Limpia lo que ya no aplica:** al salir de `CANCELADO` borra `motivoCancelacion`; al salir de `ENVIADO` borra `transportista`, `numeroExpedicion` y `trackingUrl`.
4. Añade una fila al historial con el nuevo estado.
5. Escribe `PEDIDO_ESTADO_ACTUALIZADO` con `{ codigoPed, estadoAnterior, estadoNuevo, forzado, transportista?, numeroExpedicion?, trackingUrl?, motivoCancelacion? }`.
6. Responde con el pedido y `notify { email, idioma }` del usuario que hizo el pedido, o `notify: null` si el pedido **ya estaba** en `newState` por una petición anterior con la misma clave.

Estados: `RECIBIDO → CONFIRMADO → EN_PREPARACION → PREPARADO → ENVIADO`, y `CANCELADO` aparte.

---

## 6. Empresas

### Estados
`PENDIENTE_VERIFICACION_EMAIL → PENDIENTE_APROBACION → ACTIVO ⇄ SUSPENDIDO`, y `RECHAZADO`. «Archivada» no es un estado: es `archivadoEn` con fecha.

### Registro público (#4)
Crea en una transacción: la empresa en `PENDIENTE_VERIFICACION_EMAIL`, el usuario administrador (`PARTNER_ADMIN`) **inactivo** y con `condicionesAceptadasEn`, y guarda el token de verificación. CIF o email repetido: **409** `DUPLICADO` con `campo` = `cif` o `email`.

### Verificar email (#5)
Comprueba que el token recibido es el guardado y que no ha caducado (si no, 422). En una transacción: marca `emailVerificadoEn`, borra el token y pasa la empresa a `PENDIENTE_APROBACION` **solo si estaba en `PENDIENTE_VERIFICACION_EMAIL`** (si no, 409 `CONFLICTO_ESTADO`). Devuelve la empresa (`id`, `razonSocial`, `pais`) y los emails de los administradores de IoT FENSTER activos.

### Alta directa (#18)
La empresa nace `ACTIVO`; el primer usuario nace `PARTNER_ADMIN`, **activo** y con el email ya verificado. Guarda quién la creó. Después, en la misma transacción, **sincroniza su catálogo** (sección 8). Descuento por defecto 0.

### Transiciones (#22)
| Acción | Condición | Efecto |
|---|---|---|
| `approve` | `PENDIENTE_APROBACION` | Guarda `marcaComercial`, `tarifa`, `descuentoPorcentaje` (y `marcaCatalogo` si viene), pasa a `ACTIVO`, **activa a todos los usuarios de la empresa**, sincroniza su catálogo. `notify` = usuarios con email verificado |
| `reject` | No `ACTIVO` | Pasa a `RECHAZADO`. `notify` igual |
| `suspend` | `ACTIVO` | Pasa a `SUSPENDIDO` |
| `reactivate` | `SUSPENDIDO` | Pasa a `ACTIVO` |
| `archive` | No archivada, y **sin pedidos** en `RECIBIDO`, `CONFIRMADO`, `EN_PREPARACION` ni `PREPARADO` | Pone `archivadoEn`. Si hay pedidos en curso: **409** `TIENE_PEDIDOS` con el número |
| `unarchive` | Archivada | Quita `archivadoEn` y **sincroniza su catálogo** (pudo quedar desfasado) |
| `promote` | `tipo = DISTRIBUIDOR`, `ACTIVO` y no archivada | `tipo = PARTNER` |
| `demote` | `tipo = PARTNER` | `tipo = DISTRIBUIDOR` |

Si la condición no se cumple: **409** `CONFLICTO_ESTADO`. `archive`, `unarchive`, `promote` y `demote` escriben auditoría (sección 11).

### Editar la ficha (#20)
Solo escribe si `updatedAt` es igual a `expectedUpdatedAt`; si no, **409** `CONFLICTO_VERSION`. CIF, email o `codigoCliente` repetidos: **409** `DUPLICADO` con `campo`. **Si cambia `marcaCatalogo`, sincroniza el catálogo en la misma transacción.**

### Eliminar (#21)
1. `confirmarRazonSocial` (sin espacios al principio ni al final) tiene que ser igual a la razón social; si no, **422**.
2. Si la empresa tiene **algún pedido**: **409** `TIENE_PEDIDOS` (se archiva en su lugar).
3. En una transacción: escribe `PARTNER_ELIMINADO` (nivel `warn`) y borra la empresa, que arrastra sus **usuarios, catálogo y carritos**. **La auditoría se conserva** (el vínculo pasa a nulo). Se libera su CIF y los emails.

### Volumen de compras y datos por completar
- **Volumen** = unidades (suma de `cantidad`) y número de pedidos de la empresa, **sin contar los cancelados**.
- **Datos por completar** = empresas con `cif` que empieza por `PENDIENTE`, o `dominioWeb` que termina en `.pendiente.test`, o `direccionFiscal` igual a `Pendiente de completar`.

---

## 7. Usuarios

- **Alta (#11):** la empresa tiene que estar `ACTIVO` y no archivada (si no, 409 `CONFLICTO_ESTADO`). El email no puede existir ya, sin distinguir mayúsculas (409 `DUPLICADO` con `campo: "email"`; también si dos altas chocan a la vez). El usuario nace **activo y con email verificado**, pero con una contraseña aleatoria que nadie conoce, así que solo puede entrar con el enlace de invitación (válido 7 días). *El MOCK lo devuelve con `activo: false`; el valor correcto es `true`.*
- **Sesión (#2):** `sesionInvalidadaEn` guarda desde cuándo dejan de valer las sesiones del usuario. Se actualiza al cerrar sesión, al forzar el cierre desde administración (#7 `invalidate-sessions`) y al cambiar la contraseña (#6).
- **Cambiar contraseña (#6):** solo si el token coincide con el guardado y no ha caducado; guarda el hash, **borra el token** y actualiza `sesionInvalidadaEn`.
- **Tokens:** los guarda Nest con #7 `store-token`. Hay uno de verificación y uno de restablecimiento por usuario; uno nuevo sustituye al anterior. Son únicos.
- **Login (#1):** devuelve los datos tal cual; **las reglas de acceso las aplica Nest** (cuenta desactivada, empresa pendiente, suspendida, archivada…). Con la collation `_ci` en el email basta para que la búsqueda no distinga mayúsculas.
- **Cambiar rol o activar (#23):** el usuario tiene que pertenecer a una empresa para cambiar el rol.

---

## 8. Catálogo de marca y sincronización

Hay tres catálogos de marca (`VBH`, `PROCOMSA`, `MYSMARTWINDOW`). Cada empresa tiene una `marcaCatalogo`. El catálogo de la marca (`ProductoMarca`) es **la fuente de verdad**: cada empresa de esa marca recibe una fila `RepresentacionPartner` enlazada por producto.

Restricciones: `ProductoMarca` único por `(marca, productoBaseId)` y por `(marca, skuComercial)`. `RepresentacionPartner` único por `(partnerId, skuComercial)` y por `(partnerId, productoMarcaId)`.

### Sincronizar una empresa
1. **Retira** las filas de la empresa enlazadas a un catálogo de **otra** marca (se borran; arrastran su línea de carrito). Cuenta `removed`.
2. Para cada producto del catálogo de su marca:
   - Busca su fila: la ya enlazada a ese `productoMarcaId`, o un **producto extra** (`productoMarcaId` nulo) de la empresa del mismo `productoBaseId`.
   - Si existe y ya es igual (mismo enlace, SKU, nombre, PVP y `documentacionUrl`): no hace nada.
   - Si existe y difiere: copia `productoBaseId`, `skuComercial`, `nombreComercial`, `pvpBase`, `documentacionUrl` y la **enlaza** a la marca. Cuenta `updated`.
   - Si no existe: la crea. Cuenta `created`.
   - Si choca con la restricción de SKU de la empresa: **no falla**, guarda ese SKU en `conflicts` y sigue.
3. **Nunca toca** `activo` ni `descuentoOverride` de la empresa, ni sus productos extra.

### Sincronizar una marca
Aplica lo anterior a **todas las empresas de esa marca que no estén archivadas** y suma los resultados: `{ created, updated, removed, conflicts }`.

### Cuándo se sincroniza
Al aprobar (`approve`), dar de alta (#18), desarchivar, cambiar `marcaCatalogo` (#20), y tras `add`, `update` y `apply-rate` de la marca. **`remove` no sincroniza:** el borrado del producto de la marca arrastra las filas de las empresas.

### Operaciones del catálogo de marca
- **`add`:** inserta los productos y sincroniza. Duplicado: **409** `DUPLICADO` con `campo: "skuComercial"`.
- **`update`:** cambia el producto y sincroniza. 404 si no es de esa marca.
- **`remove`:** borra el producto de la marca. Desaparece del catálogo y de los carritos de todas las empresas. **Los pedidos hechos no cambian** (la línea pierde el enlace, `representacionPartnerId = NULL`). Devuelve cuántas empresas afectó.
- **`apply-rate` (aplicar tarifa):** para los productos de la marca cuyo `ProductoBase.pvpTarifa` no es nulo y **difiere** de su `pvpBase`, pone `pvpBase = pvpTarifa` y sincroniza. Con `simulate: true` no cambia nada y solo devuelve la lista de cambios (`antes`, `despues`). **Es un job asíncrono** (MOCK v1.4 §4): el POST responde 202 con el job en `QUEUED` y `result: null`; el resultado (`processed`, `created`, `updated`, `removed`, `conflicts`, `changes`) se consulta con `GET /admin/brands/{brand}/jobs/{jobId}` hasta `DONE` o `FAILED`. `simulate` es obligatorio y booleano; `ratePercent` (también dentro de `data`) da 422. Un job con `simulate: false` exige `Idempotency-Key` y **solo puede haber uno activo (`QUEUED` o `RUNNING`) por marca**: el segundo da 409 `JOB_ALREADY_RUNNING`. Las simulaciones no se bloquean entre sí. Propongo que el job real sincronice cada empresa en su propia transacción y que, si falla, quede en `FAILED` con el `error` sin dejar ninguna empresa a medio sincronizar; el contrato no lo define, confírmalo.
- **`fill` (rellenar):** añade lo que la marca vende y aún no está en su catálogo. **Decidido: lo calcula Nest y te llega como `add` con `items[]`.** La API no lo implementa: si recibe `action: "fill"` responde 422. Decidir qué nombre y SKU usa cada marca para un producto depende del JSON de especificaciones y de reglas de normalización de texto (mayúsculas, colores, siglas) que no tienen nada que ver con la base de datos.

---

## 9. Catálogo de una empresa y productos base

- **Producto extra** = fila de la empresa sin `productoMarcaId`, asignada a mano.
- **`assign`:** crea varias filas, **todo o nada**. SKU repetido en la empresa: **409** `DUPLICADO` con `campo: "skuComercial"`.
- **`update`:** si la fila viene del catálogo de la marca, **solo** se pueden cambiar `descuentoOverride` y `activo`; cambiar SKU, nombre o PVP da **422**. Si es extra, se puede todo (SKU repetido: 409).
- **`remove`:** solo extras. Si viene de la marca, **422** («ocúltalo o quítalo del catálogo de la marca»). Al borrar desaparece de los carritos; las líneas de pedido conservan su fotografía.
- **`remove-extras`:** borra todos los extras de la empresa; los de marca no. Devuelve cuántos.
- **Producto base `create`:** `skuIndustrial` único (409 `DUPLICADO`). **`update`:** 404 si no existe. Borrar un producto base arrastra su catálogo de marca y sus asignaciones.
- **`bulk-assign`:** crea la fila en cada empresa elegida (sin lista: todas las `ACTIVO` y no archivadas). Las que ya lo tienen **se saltan**, no es error. Devuelve `assigned` y `skipped`.
- **`set-image`:** pone la misma `imagenUrl` a todos los productos (o la quita con `null`). Devuelve en `orphanImages` las urls anteriores que **ya no usa ningún producto base ni ninguna fila de empresa**, para que Nest borre el fichero. Solo urls que empiezan por `/imagenes/` y no por `/imagenes/default-`.

---

## 10. Estadísticas (#36 y #37)

Todo en UTC. **Los pedidos cancelados no son facturación:** cuentan en `byStatus` y en `cancelados`, pero no suman en ninguna otra cifra.

- **Periodo:** `desde` y `hasta` incluidos (día completo). Por defecto, los últimos 30 días hasta hoy. `desde` > `hasta` o más de 1098 días: 422.
- **Periodo anterior:** el mismo número de días justo antes del inicio, con los mismos filtros.
- **Granularidad automática de la serie:** hasta 62 días, por día; hasta 366, por semana (**empieza en lunes**); más, por mes.
- **Serie:** **todos** los tramos del periodo, rellenando con 0 los que no tienen pedidos.
- **KPIs:** `pedidos` (sin cancelados), `facturado` (suma de `totalNeto` sin cancelados), `ticketMedio` = `facturado / pedidos` redondeado a 2 decimales (0 si no hay pedidos), `unidades` (suma de cantidades de las líneas), `sinEnviar` (pedidos del periodo que no están `ENVIADO` ni `CANCELADO`), `cancelados`.
- **Por estado:** todos los estados del periodo, con `cantidad` y `facturado`.
- **Por empresa:** ranking por `facturado` descendente, con `pedidos`, `unidades` y la marca de la empresa.
- **Por marca:** suma del ranking por la `marcaCatalogo` de cada empresa.
- **Por producto:** agrupado por `(skuComercial, nombreProducto)` de las líneas, con `unidades` y `facturado`; orden por `facturado` descendente.
- **`companies` / `empresas`:** todas las empresas que tienen al menos un pedido (sin límite de fechas), por razón social, para el desplegable del filtro.
- **Filtros:** `marca` filtra por la `marcaCatalogo` de la empresa; `partnerId` por empresa.
- **Excel (#37):** los rankings **completos** (sin límite) y **una fila por pedido** del periodo, **cancelados incluidos**, ordenados por fecha ascendente: `codigoPed`, `createdAt`, `estado`, `poNumber`, `totalNeto`, razón social, marca y unidades.

---

## 11. Auditoría

**Eventos de negocio** (los escribe la API **en la misma transacción** que el cambio, con el actor de `X-Actor-User-Id`):

| `eventType` | Cuándo | `payload` |
|---|---|---|
| `PEDIDO_CONFIRMADO` | #14 | `{ codigoPed, totalNeto }` |
| `PEDIDO_ESTADO_ACTUALIZADO` | #35 | Ver sección 5 |
| `PARTNER_PROMOCIONADO` | `promote` | `{ razonSocial, tipoAnterior, tipoNuevo, unidadesCompradas, pedidos }` |
| `PARTNER_DEGRADADO` | `demote` | Igual |
| `PARTNER_ARCHIVADO` | `archive` | `{ razonSocial }` |
| `PARTNER_DESARCHIVADO` | `unarchive` | `{ razonSocial }` |
| `PARTNER_ELIMINADO` (nivel `warn`) | #21 | `{ partnerId, razonSocial, cif, usuariosEliminados, productosAsignados }` |

Nivel `info` salvo `PARTNER_ELIMINADO`. **Es un registro de solo añadir:** el usuario MySQL de la API solo debería poder hacer `INSERT` en esa tabla.

**Accesos (#38):** Nest acumula los eventos y manda un lote cada pocos segundos o cada cierto número de eventos. Cada uno lleva `eventId`; si ya existe, cuenta como `duplicates` y no falla. El `eventType` de acceso tiene la forma `MÉTODO ruta` (por ejemplo `POST /auth/login`). Al borrar un usuario o una empresa, `userId` y `partnerId` de sus eventos pasan a nulo.

---

## 12. Relaciones y borrados en cascada

| Al borrar… | Qué pasa |
|---|---|
| Una empresa | Se borran sus usuarios, catálogo, carritos. **Se prohíbe si tiene pedidos** |
| Un usuario | Se borra su carrito. Se prohíbe si tiene pedidos |
| Un producto base | Se borran sus filas de marca y de empresa (y sus líneas de carrito) |
| Un producto de marca | Se borran las filas de las empresas enlazadas (y sus líneas de carrito) |
| Una fila de catálogo de empresa | Se borran sus líneas de carrito; las líneas de pedido pasan a `representacionPartnerId = NULL` |
| Un pedido | Se borran sus líneas e historial |

---

## 13. Concurrencia e idempotencia

- Una escritura `[Idem]` con una `Idempotency-Key` ya usada en las últimas **24 h** devuelve **la misma respuesta** que la primera vez, sin repetir el efecto.
- La misma clave con un **cuerpo distinto**, o usada en **otra ruta u operación**: **409 `IDEMPOTENCY_KEY_REUSED`** (MOCK v1.4 §7). La clave es global durante las 24 h. Misma clave, mismo método, ruta y cuerpo: se devuelve el mismo estado HTTP y el mismo cuerpo que la primera vez.
- Un job real de `apply-rate` por marca a la vez: 409 `JOB_ALREADY_RUNNING` (ver sección 8).
- `expectedState` y `expectedUpdatedAt` se comprueban **dentro de la propia sentencia de escritura** (`UPDATE … WHERE estado = ?`), no con una lectura previa: si cambia entre medias, 409.
- Los 404 son **siempre iguales** exista o no el recurso, o sea de otra empresa.

**Pruebas de concurrencia que hay que pasar:** confirmar el mismo carrito dos veces a la vez (un solo pedido); 20 confirmaciones simultáneas de empresas distintas (numeración correlativa, sin huecos ni repetidos); dos administradores cambiando el estado del mismo pedido (uno gana, el otro 409); dos «añadir» simultáneos al mismo producto (se suman).
