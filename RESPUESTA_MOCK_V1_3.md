# MOCK v1.3: resultado de las pruebas

Hola Fran. He probado la v1.3 con el cliente de NestJS (41 casos, `npm run api:contrato -- --escrituras`) y con una sonda de más de 200 llamadas. Te cuento qué va bien y qué necesito que cambies antes de dar el contrato por congelado.

## 1. Lo que va bien
- Los cuerpos de la v1.3 se aceptan en las 38 rutas, y el MOCK rechaza con 422 los cuerpos antiguos (`itemId`, `items[]`, `productIds[]`, datos de `approve`).
- `X-Mock-Error` funciona con los 13 códigos, con el estado HTTP y el formato `{codigo, mensaje}` del §8.
- Idempotencia: la misma clave y el mismo cuerpo devuelven la respuesta guardada con `X-Mock-Idempotency-Replay: true`; con otro cuerpo, 409 `IDEMPOTENCY_KEY_REUSED`.
- Los campos que pedí en las secciones 2 y 3 de mi primer documento ya vienen: los he comprobado uno a uno en #8 a #37.
- Filtros, paginación (`limit` se recorta a 100), `desde > hasta` con 422, `createdBy` con 404 y `fill` con 422.

## 2. Lo que necesito que cambies
1. **`X-Actor-Partner-Id` no puede ser obligatoria en `/admin/*`.** El administrador de IoT FENSTER no tiene empresa. Hoy 10 escrituras (#18, #20, #21, #22, #23, #26, #28, #31, #32 y #35) dan 422 «Falta la cabecera X-Actor-Partner-Id». Con la cabecera puesta pasan todas. En `/admin/*` solo debería ser obligatoria `X-Actor-User-Id`.
2. **Tres rutas de tu PDF no están desplegadas** y dan `403 Missing Authentication Token`: `GET /admin/brands/{brand}/jobs/{jobId}` (el `statusUrl` del 202 apunta ahí), `GET /legal-settings` y `PUT /admin/legal-settings`. Falta el Deploy API en el stage v1. Sin la del job no puedo recoger el resultado de `apply-rate`.
3. **Respuesta del job.** Dime los estados posibles (`QUEUED`, `RUNNING`, `DONE`, `FAILED`…) y dónde viene el resultado (`processed`, `created`, `updated`, `removed`, `conflicts`, `changes[]`). Para los ajustes legales, el cuerpo del PUT (te propuse `expectedUpdatedAt` más los campos) y la respuesta del GET.
4. **`apply-rate`:**
   - Acepta el cuerpo antiguo con `data.ratePercent` y da 202. Como con `fill`, debería dar 422.
   - Sin `simulate` también da 202. Debe ser un booleano obligatorio.
   - Se pueden lanzar dos jobs reales a la vez sin `Idempotency-Key`. ¿Exiges la clave o devuelves 409 si ya hay un job de esa marca en curso?
5. **Marca que no existe** (`/admin/brands/NOEXISTE/...`): el catálogo da 200 y el job da 202. Debe ser 404.
6. **`Idempotency-Key`:** el MOCK la exige en #13 `add` y `repeat-order` y en #26 `assign`, pero la matriz del §4 no los marca como `[Idem]`. Lo he implementado como el MOCK; marca el §4 para que el PHP sea igual. Una misma clave usada en otra ruta también da 409: confirma que es lo que quieres.

## 3. Para el PHP (el MOCK no lo valida)
- Valores fuera de lista aceptados con 200: `expectedState` y `newState` desconocidos (#35), `expectedState` (#22), `idioma` (#7), `rol` (#23), y `estado`, `orden` o `marca` en los filtros. Deben dar 422.
- #23 con cuerpo vacío da 200; debe exigir al menos `rol` o `activo`.
- Decimales sin validar: `totalEsperado: "abc"` y `totalEsperado: 1250` (número) dan 201. Deben ser texto con formato `1250.00`.
- #14 sin `poNumber` da 201; es obligatorio.
- #20 con `estado` o `tipo` en el cuerpo da 200; no se editan ahí (se ignoran o 422).
- #21: con una `confirmarRazonSocial` distinta da 200. Yo lo compruebo en NestJS; compruébalo también tú si quieres.
- #36: un rango de más de 1098 días, `limite=0` o una fecha mal escrita dan 200. El rango debe dar 422.
- #38 acepta eventos sin los campos obligatorios y con `eventId` que no es un UUID.
- Las rutas inexistentes siguen dando `{"message":"Missing Authentication Token"}` en vez de `{codigo, mensaje}` (tu §12 lo deja pendiente).

## 4. Lo que el MOCK no puede probar
Con ids de otra empresa o inexistentes devuelve 200 con datos inventados, así que el aislamiento entre empresas, los 404 reales, los duplicados reales (CIF y email), el cálculo de precios y totales, la numeración `PED` y la concurrencia solo se pueden probar con el PHP. Voy a ampliar el script para que sirva de pruebas de aceptación contra el endpoint real.

## 5. Lo que ya he cambiado yo
El cliente de NestJS ya envía los cuerpos de la v1.3: `itemId` en el carrito, `Idempotency-Key` en `add`, `repeat-order` y `assign` (lo tenía al revés), `items[]` en #31, `productIds[]` en #28, los datos completos de #4, #11, #18 y #22, y `apply-rate` sin porcentaje y con job. También los tipos de las respuestas. Con la cabecera del punto 1 puesta, pasan las 38 rutas; solo fallan las tres del punto 2.

## 6. Criterio del §13
| Criterio | Estado |
|---|---|
| Cuerpos v1.3 = lo que envía NestJS | Sí, salvo la cabecera del punto 1 |
| Respuestas con todos los campos de la web | Sí |
| Happy paths, 404, 409, 422, cabeceras e idempotencia | Sí, con `X-Mock-Error` |
| `fill` en NestJS y `apply-rate` sin porcentaje | Sí, pero ver el punto 4 |
| 409 `IDEMPOTENCY_KEY_REUSED` | Aceptado |
| Reglas de negocio como especificación del PHP | Falta que confirmes `REGLAS_DE_NEGOCIO_API.md` |
| El Lambda sustituirá los mocks sin cambiar rutas | De acuerdo |

No lo doy por congelado hasta que resuelvas los puntos 1 a 3 y confirmes las reglas de negocio.
