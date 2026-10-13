# MOCK v1.5: resultado de las pruebas y qué falta para congelar

Hola Fran. He probado la v1.5 (13-oct) con el cliente de NestJS (41 casos, `npm run api:contrato -- --escrituras`) y con más de 300 llamadas directas: las pruebas de aceptación de `AJUSTES_LEGALES_API.md` §7 que se pueden lanzar contra un MOCK (todas salvo la 1, la 4, la 10 y la 21), el ciclo completo de los jobs, validaciones y concurrencia. Gracias por desplegar las tres rutas. Te dejo qué va bien y, en orden de prioridad, qué necesito que cambies.

## 1. Lo que va bien (no hace falta tocarlo)
- **Las tres rutas están desplegadas:** `GET /admin/brands/{brand}/jobs/{jobId}`, `GET /legal-settings` y `PUT /admin/legal-settings`. El script da 41 de 41 (el 41 mandaba solo `expectedUpdatedAt` y ahora relee la fila y reescribe `telefono`).
- **Ajustes legales:** el GET trae las 15 claves en el orden del §2. El PUT pasa todo lo probable: 13 campos en el máximo (200) y en máximo+1 (422 con `campo`), número, booleano, objeto o array 422, `null` y `""` guardan `null`, campo ausente no cambia, `id`/`updatedAt`/`unica`/`condicionesVentaUrl`/`privacidadUrl` 422, 409 `CONFLICTO_VERSION` con `expectedUpdatedAt` antiguo o `null` y sin cambiar nada, UTF-8 byte a byte, 200 caracteres «ñ» aceptados (cuenta caracteres, no bytes), `X-Actor-Partner-Id` ignorada, sin `X-Actor-User-Id` 422.
- **Jobs:** el 202 trae `jobId`, `QUEUED` y `statusUrl`; el GET llega a `DONE` con `result` (`processed`, `created`, `updated`, `removed`, `conflicts`, `changes[]`); el real exige `Idempotency-Key`; 409 `JOB_ALREADY_RUNNING` por marca (los simulate no se bloquean, y otra marca sí puede); 409 `IDEMPOTENCY_KEY_REUSED`; el replay devuelve el mismo `jobId`; 404 idéntico para job inexistente, de otra marca, marca desconocida o `jobId` mal formado; `fill`, `ratePercent`, sin `simulate` y `simulate` no booleano dan 422. `X-Mock-Error: JOB_ALREADY_RUNNING` ya se reconoce.

## 2. Lo que necesito que cambies antes de congelar

### 2.1 Errores del API Gateway en formato `{codigo, mensaje}`
Las rutas y métodos inexistentes siguen dando `403 {"message":"Missing Authentication Token"}`: por ejemplo `GET /v1/ruta-que-no-existe`, `DELETE /v1/admin/legal-settings` o `POST /v1/legal-settings`. Tu §12 lo dejaba pendiente y ahora es lo único del contrato de errores que no se cumple. Se arregla con *Gateway Responses*, sin tocar la Lambda ([documentación de AWS](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-gatewayResponse-definition.html)):

| Response type | Estado | Cuerpo propuesto |
|---|---|---|
| `MISSING_AUTHENTICATION_TOKEN` (también salta con un método no definido) | 404 | `{"codigo":"RUTA_NO_ENCONTRADA","mensaje":"La ruta o el método no existen."}` |
| `RESOURCE_NOT_FOUND` | 404 | igual que el anterior |
| `THROTTLED`, `QUOTA_EXCEEDED` | 429 | `{"codigo":"DEMASIADAS_PETICIONES","mensaje":"Demasiadas peticiones. Reintenta en unos segundos."}` |
| `UNAUTHORIZED` | 401 | `{"codigo":"UNAUTHORIZED","mensaje":"No autenticado."}` |
| `ACCESS_DENIED`, `INVALID_API_KEY`, `INVALID_SIGNATURE`, `EXPIRED_TOKEN`, `WAF_FILTERED` | 403 | `{"codigo":"FORBIDDEN","mensaje":"Acceso denegado."}` |
| `INTEGRATION_TIMEOUT`, `INTEGRATION_FAILURE`, `DEFAULT_5XX` | 504 / 504 / sin cambio | `{"codigo":"NO_DISPONIBLE","mensaje":"El servicio no está disponible."}` |
| `DEFAULT_4XX` (el resto, p. ej. 413) | sin cambio | `{"codigo":"PETICION_NO_VALIDA","mensaje":"La petición no es válida."}` |

- `MISSING_AUTHENTICATION_TOKEN` cubre «token que falta» **y** «ruta o método no definido», así que `DELETE` sobre una ruta que existe también dará 404, no 405. Me vale; solo anótalo en el §12.
- Se hace con `x-amazon-apigateway-gateway-responses` en el OpenAPI o con `put-gateway-response`. El cuerpo es una plantilla sin VTL; el estado sale de `statusCode`, no del texto de la plantilla. Recuerda el Deploy API en el stage `v1`, como pasó con las tres rutas.
- Añade `RUTA_NO_ENCONTRADA`, `DEMASIADAS_PETICIONES` y `PETICION_NO_VALIDA` a la tabla de errores (§10). El cliente de NestJS trata todo 404 como «no encontrado» opaco, todo 429/502/503/504 como reintentable (en GET) y 401/403 como «API mal configurada»; con el código nuevo queda en el log por qué falló.

### 2.2 Job `FAILED`: forma del error y manera de provocarlo
La v1.5 dice «FAILED contiene `error` y `result=null`» y nada más. Hoy no puedo probarlo.
1. Define la forma de `error`. Propongo `{codigo, mensaje}`, igual que el resto de la API.
2. Que el MOCK permita provocarlo: `X-Mock-Error: JOB_FAILED` en el POST del job debe dejarlo en `FAILED` con `result: null` y `error` relleno. Ahora responde 422 «X-Mock-Error no reconocido».
3. Define y documenta qué pasa con el bloqueo por marca: un job `FAILED` debe liberarlo, y un job atascado en `QUEUED` o `RUNNING` necesita un tiempo máximo (por ejemplo 15 minutos, pasa a `FAILED` con `JOB_TIMEOUT`), si no la marca queda bloqueada para siempre. Esto no es teórico: **en el MOCK el job solo avanza cuando alguien lo consulta**. Un job real creado a las 09:18:24 seguía en `QUEUED` a las 09:21:42, pasó a `RUNNING` en el primer GET (ahí se rellena `startedAt`) y a `DONE` en el siguiente, y hasta entonces todos los `POST` de esa marca daban 409 `JOB_ALREADY_RUNNING`. Si el PHP ejecuta el job en segundo plano, que no dependa de que alguien consulte; si es así también en el PHP, el tiempo máximo es obligatorio.
4. Confirma la regla de atomicidad que propuse en `REGLAS_DE_NEGOCIO_API.md` §8: cada empresa se sincroniza en su propia transacción y, si falla, el job queda `FAILED` sin dejar ninguna empresa a medio sincronizar.

### 2.3 Qué significa cada número del `result`
Hoy un `apply-rate` simulado sobre VBH devuelve `processed: 58`, `updated: 21` y `changes` con **un solo** elemento (`VBH-410`, de `"120.00"` a `"100.00"`). Cuadra solo si `updated` cuenta filas de catálogo **de empresa** sincronizadas (21 empresas tienen ese producto) y `changes` los precios **de la marca**. Confirma que es eso y escríbelo en el contrato:
- `processed`: productos de la marca revisados.
- `changes`: precios de la marca que cambian (SKU, `antes`, `despues`).
- `created`, `updated`, `removed`, `conflicts`: resultado de sincronizar los catálogos de empresa (el mismo `sync` de #31).
- Con `simulate: true`, ¿son lo que cambiaría? Y qué lleva cada elemento de `conflicts` (hoy es un array vacío).

### 2.4 Documentación del GET del job
- El GET devuelve `startedAt` y `completedAt` (el 202 los trae a `null`); no están en el contrato. Documéntalos.
- `statusUrl` viene solo en el 202. Me parece bien: dilo en el contrato («solo en la respuesta inicial»).

## 3. Opcional en el MOCK (si va a durar; si el PHP llega pronto, ignóralo)
- **Estado compartido.** El MOCK guarda el estado en la memoria de cada instancia Lambda. Una ráfaga de 30 GET simultáneos a `/legal-settings` devolvió **6 estados distintos**, y 5 PUT simultáneos con el mismo `expectedUpdatedAt` dieron una vez dos 200 (cada petición cayó en una instancia con su propia copia). Con peticiones secuenciales no se nota. Se arregla guardándolo en DynamoDB con escritura condicional (`ConditionExpression` sobre `updatedAt`). Si no, anótalo: las pruebas de concurrencia (la 18 de ajustes legales y las de pedidos del §13) solo valen contra el PHP/MySQL.
- **El job real no cambia nada.** Tras dos jobs reales en `DONE`, `VBH-410` sigue en `"120.00"` y el segundo job devuelve los mismos `changes`. Si lo cambiases (`pvpBase = pvpTarifa`), un segundo job daría `changes: []` y podría comprobar el efecto. Si no, anótalo como limitación.

## 4. Para el PHP (el MOCK no lo valida): ampliación del §3 de mi v1.3
Probado hoy, no son cambios en el MOCK. El PHP debe responder 422 con `campo`:
- **Decimales sin validar en todas las escrituras:** #18, #20, #22 (`approve`), #26 (`pvpBase`, `descuentoOverride`), #28 (`pvpTarifa`) y #31 (`pvpBase`) aceptan con 2xx `"abc"`, `"15.555"` (3 decimales), `"100.01"` y `"-1.00"` en porcentajes, `"-5.00"` en importes, y un número JSON (`15.5`). Regla: texto decimal, con como máximo 2 decimales (`DECIMAL(5,2)` en porcentajes y `DECIMAL(12,2)` en importes), porcentajes de 0 a 100 e importes ≥ 0. En #14 `totalEsperado` ya se valida: que valga la misma regla en todas.
- **Ids de ruta:** un id que no es UUID (`/admin/companies/no-es-uuid`) da 200 con datos de ejemplo. Debe dar 404 igual que un id inexistente.
- **Filtros:** `desde` y `hasta` de `GET /admin/orders` (#33) no se validan (`ayer`, `2026-13-45`, `desde` posterior a `hasta`), mientras #15 y #36 sí. `include=todo` (#17) y `granularidad=foo` (#36) se aceptan: deben dar 422 con `allowed`.
- **Paginación:** los valores inválidos se corrigen en silencio (`limit=0` y `limit=abc` dan 20, `limit=-5` da 1, `limit=500` da 100, `page=0` da 1). El recorte de `limit` a 100 ya me valía, pero `limit=0`, `limit=-5`, `limit=abc` y `page=0` deberían dar 422; si prefieres recortar, documéntalo. En #24 `limit` (0, -1, `abc`, 100000) no se valida.
- **Cabeceras:** `X-Request-Id`, `X-Actor-User-Id` e `Idempotency-Key` que no son UUID se aceptan. Si el contrato exige UUID, 422; si no, dilo («texto opaco, hasta N caracteres»).
- **Marca en minúsculas:** `/admin/brands/vbh/jobs` se acepta y se normaliza a `VBH`. Decide si el PHP lo acepta o da 404 y documéntalo (NestJS valida la marca con un enum sensible a mayúsculas).
- **`Content-Type`:** un POST con `text/plain` se procesa como JSON. El PHP debería exigir `application/json`.
- **Ajustes legales:** `expectedUpdatedAt` mal formado (`"ayer"`) da 409, no 422. Es coherente con tu spec («debe ser exactamente su `updatedAt`») y me vale, pero déjalo escrito. Las pruebas 1, 4 y 10 (tabla vacía) y la 18 (concurrencia) hay que pasarlas contra el PHP.

## 5. Antes de datos reales: decisión que sigue abierta
El MOCK responde **sin ninguna autenticación**. La propuesta (§11, punto 1) deja abierto cómo se autentica NestJS ante la API: **IAM (SigV4)** o **API privada con VPC endpoint**, «nunca expuesta a internet». Las rutas `/admin/*` confían en `X-Actor-User-Id`, así que quien llegue a la API puede actuar como administrador. Necesito saber cuál eliges antes de que el PHP reciba datos reales:
- Con **IAM**, el cliente de NestJS tiene que firmar las peticiones con SigV4 (hoy solo sabe mandar `x-api-key`; lo implemento yo).
- Con **VPC endpoint**, el backend de NestJS tiene que estar desplegado dentro de la misma VPC (o con VPN) y cambia dónde lo alojamos.

También sigue sin fecha de entrega del PHP/MySQL del Datacenter.

## 6. Qué haré yo cuando contestes
- Ya hecho en el cliente de NestJS (sin conectarlo a los servicios todavía): repositorio `PartnersApiAjustesLegalesRepository` con `obtener()` (GET, pública) y `guardar()` (PUT con `expectedUpdatedAt`, sin `Idempotency-Key` ni reintentos), tipos de los 13 campos, y 4 tests. El caso 41 del script ya usa ese repositorio.
- Pendiente: añadir los casos de `FAILED` y de Gateway cuando existan. La página de administración de datos legales tendrá que llevar el `updatedAt` leído y avisar si llega un 409 `CONFLICTO_VERSION`.
- Vuelvo a pasar las pruebas y, cuando el 2.1, el 2.2 y el 2.3 estén cerrados, te confirmo el contrato.

## Apéndice: cómo reproducirlo
Todas las peticiones llevan `X-Request-Id` (aquí `$(uuidgen)`); las escrituras, también `X-Actor-User-Id`.
```bash
B=https://055cjz2gki.execute-api.eu-west-1.amazonaws.com/v1
U=0b1c0000-0000-4000-8000-000000000001

# 2.1 Gateway: ruta inexistente y método no definido
curl -i "$B/ruta-que-no-existe"
curl -i -X DELETE "$B/admin/legal-settings"

# 2.2 FAILED: no se reconoce
curl -i -X POST "$B/admin/brands/VBH/jobs" -H "Content-Type: application/json" \
  -H "X-Request-Id: $(uuidgen)" -H "X-Actor-User-Id: $U" -H "X-Mock-Error: JOB_FAILED" \
  -d '{"action":"apply-rate","simulate":true}'

# 2.3 result del job simulado: updated=21 y changes con 1 elemento
curl -s -X POST "$B/admin/brands/VBH/jobs" -H "Content-Type: application/json" \
  -H "X-Request-Id: $(uuidgen)" -H "X-Actor-User-Id: $U" -d '{"action":"apply-rate","simulate":true}'
# después: GET $B/admin/brands/VBH/jobs/{jobId}

# 3 Estado por instancia: repetir varias veces en paralelo y comparar updatedAt
for i in $(seq 30); do curl -s "$B/legal-settings" -H "X-Request-Id: $(uuidgen)" & done | grep -o '"updatedAt":"[^"]*"' | sort | uniq -c

# 4 Decimales: «abc» como descuento se acepta con 201
curl -i -X POST "$B/admin/companies" -H "Content-Type: application/json" -H "X-Request-Id: $(uuidgen)" \
  -H "X-Actor-User-Id: $U" -H "Idempotency-Key: $(uuidgen)" \
  -d '{"companyId":"'$(uuidgen)'","tipo":"PARTNER","marcaCatalogo":"VBH","razonSocial":"Prueba SL","cif":"B99999990","direccionFiscal":"Calle Mayor 10","pais":"ES","dominioWeb":"prueba.es","descuentoPorcentaje":"abc","usuario":{"userId":"'$(uuidgen)'","email":"a@prueba.es","nombre":"Ana","passwordHash":"$2b$12$prueba","idioma":"ES"}}'

# 4 Id que no es UUID: 200 con datos de ejemplo
curl -i "$B/admin/companies/no-es-uuid" -H "X-Request-Id: $(uuidgen)"
```
