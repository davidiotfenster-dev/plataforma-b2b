# Partners API MOCK v1.1: qué falta frente a la propuesta de 38 rutas

Hola Fran. He probado el MOCK contra la propuesta de 38 rutas que se aceptó. Las 38 rutas coinciden (método y ruta, una por una) y las 38 responden bien, escrituras incluidas. Esto es lo que falta antes de programar el PHP, según la regla de congelación del §15.

## 1. Lo que el MOCK no hace
- **No valida ni falla nunca.** No devuelve ningún 404, 409 ni 422 de negocio: un id inventado da 200, un CIF duplicado da 201 y un `expectedState` que no coincide da 200. Así no puedo probar el aislamiento entre empresas, la idempotencia ni el tratamiento de errores.
- **Ignora filtros y paginación** (`estado`, `busqueda`, `companyId`, `desde/hasta`…): siempre devuelve una fila. `include=summary` y `groupBy=company` sí funcionan.
- **No exige** `X-Request-Id`, `X-Actor-*` ni `Idempotency-Key`.
- Una ruta o método inexistente da `403 {"message":"Missing Authentication Token"}` en vez de `{codigo, mensaje}`. Un JSON roto da 400 y el contrato dice 422.

## 2. Campos que la propuesta pedía y no vienen
| Ruta | Falta |
|---|---|
| #8 catálogo | Las especificaciones del producto |
| #16 detalle de pedido | Foto por línea y razón social |
| #19 ficha de empresa | Volumen de compras en unidades y pedidos (viene como importe) |

## 3. Campos que la web usa y no vienen
| Ruta | Falta |
|---|---|
| #8 / #9 | `documentacionUrl`; especificaciones completas en #9 |
| #10 usuarios | `emailVerificadoEn`, `createdAt` |
| #12 / #13 carrito | Por línea: `imagenUrl`, `pvpBase`, descuento. En `repeat-order`: productos retirados y precios cambiados |
| #15 mis pedidos | `poNumber`, transportista, expedición, tracking, nº de artículos y resumen de productos |
| #17 listado | En el resumen: `total`, `datosPorCompletar`, `archivadas` |
| #17 / #19 ficha | 21 campos de 34: país, dominio, marca comercial, tarifa, teléfonos, direcciones desglosadas, correos, forma de pago, divisa, IVA, notas, creador |
| #25 / #30 | Producto base anidado (SKU, nombre técnico, foto, especificaciones); en #25 también `productoMarcaId` y marca |
| #27 productos | `especificacionesJson`, `createdAt` |
| #29 empresas de un producto | `id`, `activo`, `descuentoOverride`, estado y marca de la empresa |
| #33 pedidos admin | `razonSocial` por pedido |
| #36 / #37 estadísticas | Unidades, `sinEnviar`, `cancelados`, por marca, SKU de cada producto |

## 4. Cuerpos de petición incompletos
El PDF da ejemplo de 8 de las 28 acciones y los que da están cortos. El cuerpo completo de cada una (campo, tipo, obligatorio) está en [CUERPOS_DE_ACCIONES_API.md](CUERPOS_DE_ACCIONES_API.md) y las reglas de cada operación en [REGLAS_DE_NEGOCIO_API.md](REGLAS_DE_NEGOCIO_API.md). Resumen de lo que faltaba:

| Ruta | Falta en el ejemplo del PDF |
|---|---|
| #4 registro | Dirección fiscal, país, dominio, nombre del administrador, idioma, aceptación de condiciones |
| #18 alta de empresa | Email, nombre y hash del primer usuario; resto de la ficha |
| #22 `approve` | `marcaComercial`, `tarifa` (y 7 acciones más sin cuerpo) |
| #26 `assign` | `nombreComercial`, `pvpBase` (y 3 acciones más) |
| #28 `create` | `especificacionesJson` (y 3 acciones más) |
| #31 `add` | `pvpBase`, varios productos a la vez (y 2 acciones más) |
| #32 `apply-rate` | **No lleva porcentaje**: copia el PVP de la tarifa oficial de cada producto al catálogo de la marca. El MOCK usa `ratePercent` |
| #11 alta de usuario | El MOCK devuelve `activo: false`; el usuario nace activo y con el email verificado |
| #35 | Campo del motivo de cancelación |
| #7 / #13 | `store-token`; `set-quantity`, `remove`, `repeat-order` |

## 5. Fuera del contrato
**Ajustes legales** (CIF, domicilio, portes, forma de pago…): ninguna de las 38 rutas los cubre. Propongo `GET /v1/legal-settings` (pública) y `PUT /v1/admin/legal-settings` (con `expectedUpdatedAt`).

## 6. Qué necesito de ti
1. Que el MOCK permita **provocar errores** (una cabecera `X-Mock-Error` o ids especiales) para probar los 404, 409 y 422.
2. Que las respuestas por defecto del Gateway usen el formato `{codigo, mensaje}`.
3. Añadir los campos de las secciones 2 y 3.
4. Revisar y confirmar los cuerpos de [CUERPOS_DE_ACCIONES_API.md](CUERPOS_DE_ACCIONES_API.md).
5. Revisar [REGLAS_DE_NEGOCIO_API.md](REGLAS_DE_NEGOCIO_API.md) y confirmar que las cumples: transacción única por operación, precios calculados en la API (con los casos de prueba), auditoría dentro de la misma transacción y numeración `PED` sin huecos.
6. La API hoy está abierta y sin clave: ¿IAM o VPC endpoint? Y que no se registren cuerpos de respuesta, porque el login devuelve el hash.
7. Qué pasa si llega la misma `Idempotency-Key` con un cuerpo distinto.
8. Timeout de los procesos masivos (#32): son unas 800 operaciones y el Gateway corta a los 29 s.
9. **Fecha del Datacenter con datos reales.**
