# Ajustes legales: especificación completa de `/legal-settings`

Hola Fran. La v1.4 define `GET /legal-settings` y `PUT /admin/legal-settings` con 7 campos y yo guardo 13. Es culpa mía: en el primer documento solo te puse tres ejemplos y no te pasé la lista completa. Aquí está todo, campo a campo, para que no haya que adivinar nada. Al final tienes una lista de verificación y las pruebas de aceptación.

**Un solo juego de nombres para toda la cadena** (web, NestJS, contrato y MySQL): los 13 nombres de la sección 1, tal cual. Esto implica dos cambios en tu PDF: `portesTexto` pasa a `portes` y `formaPagoTexto` pasa a `formaPago`. Y `condicionesVentaUrl` y `privacidadUrl` se quitan: no existen en mi base de datos, las páginas legales las genera el propio portal.

## 0. Qué es
Los datos de IoT FENSTER que salen en los textos legales públicos (aviso legal, privacidad, condiciones de uso). Se editan desde el panel de administración. **Hay una sola fila.** Un campo vacío (`null`) se muestra en las páginas como «pendiente» en ámbar, para que no se publique nada sin completar. Por eso el GET **siempre devuelve los 13 campos**, también los vacíos.

## 1. Los 13 campos (no falta ninguno)
Todos son texto, todos son opcionales (pueden ser `null`) y todos son editables.

| # | Campo | Máx. caracteres | Qué es | Valor actual (8-oct) |
|--:|---|---:|---|---|
| 1 | `razonSocial` | 200 | Razón social de IoT FENSTER | `IoT FENSTER S.L.` |
| 2 | `cif` | 40 | CIF | `B72658198` |
| 3 | `domicilio` | 300 | Domicilio social | `C/ P.P. Los Leones, P. Tec. FT Álamo, OTR 21, Puerta 5, Ctra. El Estrecho-Lobosillo, km 2,5, Parque Tecnológico de Fuente Álamo, 30320 Fuente Álamo (Murcia), España` |
| 4 | `emailContacto` | 200 | Email de contacto | `info@iotfenster.com` |
| 5 | `emailPrivacidad` | 200 | Email para ejercer derechos de privacidad | `info@iotfenster.com` |
| 6 | `telefono` | 60 | Teléfono | `+34 968 124 979` |
| 7 | `registroMercantil` | 300 | Datos de inscripción en el Registro Mercantil | `null` |
| 8 | `alojamiento` | 300 | Proveedor y país donde se alojan la web y la base de datos | `Amazon Web Services, servidores en la Unión Europea` |
| 9 | `ciudadTribunales` | 100 | Ciudad cuyos juzgados resuelven los conflictos | `Murcia (España)` |
| 10 | `portes` | 2000 | Cláusula de portes (texto libre) | `null` |
| 11 | `formaPago` | 2000 | Cláusula de forma de pago (texto libre) | `null` |
| 12 | `devoluciones` | 2000 | Cláusula de devoluciones (texto libre) | `null` |
| 13 | `plazoRegistros` | 100 | Cuánto se guardan los registros de seguridad | `12 meses` |

Además, en las respuestas van **`id`** (uuid de la fila) y **`updatedAt`** (ISO 8601 UTC con milisegundos). Estos dos **no se editan**.

Los formatos (que un email sea un email, recortar espacios) los valida NestJS antes de llamarte. La API valida tipo, longitud y obligatoriedad, porque MySQL no debe truncar en silencio.

## 2. `GET /legal-settings`
- **Público**: sin sesión. Solo `X-Request-Id` (obligatoria en todas las peticiones, también en GET). Ni `X-Actor-User-Id` ni `X-Actor-Partner-Id`.
- Respuesta 200, siempre con las 15 claves (los 13 campos más `id` y `updatedAt`), en este orden:

```json
{
  "id": "c9c561f0-573c-4353-bb7e-b9df307756c9",
  "razonSocial": "IoT FENSTER S.L.",
  "cif": "B72658198",
  "domicilio": "C/ P.P. Los Leones, P. Tec. FT Álamo, OTR 21, Puerta 5, Ctra. El Estrecho-Lobosillo, km 2,5, Parque Tecnológico de Fuente Álamo, 30320 Fuente Álamo (Murcia), España",
  "emailContacto": "info@iotfenster.com",
  "emailPrivacidad": "info@iotfenster.com",
  "telefono": "+34 968 124 979",
  "registroMercantil": null,
  "alojamiento": "Amazon Web Services, servidores en la Unión Europea",
  "ciudadTribunales": "Murcia (España)",
  "portes": null,
  "formaPago": null,
  "devoluciones": null,
  "plazoRegistros": "12 meses",
  "updatedAt": "2026-10-08T14:04:31.496Z"
}
```

- **Si todavía no existe la fila**: 200 con los 13 campos a `null`, `id: null` y `updatedAt: null`. **No es un 404.**
- Un campo vacío siempre sale como `null`, nunca como `""`.

## 3. `PUT /admin/legal-settings`
- Cabeceras: `X-Request-Id` y `X-Actor-User-Id` obligatorias. **No** `X-Actor-Partner-Id` (es `/admin/*`; si llega, se ignora). No lleva `Idempotency-Key`.
- Cuerpo: `expectedUpdatedAt` más los campos que cambian (de 1 a 13):

```json
{
  "expectedUpdatedAt": "2026-10-08T14:04:31.496Z",
  "telefono": "+34 968 000 000",
  "registroMercantil": "Inscrita en el Registro Mercantil de Murcia, tomo X, folio Y, hoja MU-Z",
  "portes": null
}
```

| Caso | Qué hace la API |
|---|---|
| Campo **ausente** | No cambia |
| Campo con texto | Lo guarda tal cual (sin recortar: NestJS ya lo ha recortado) |
| Campo `null` | Lo vacía |
| Campo `""` | Lo guarda como `null` (nunca se guarda una cadena vacía) |
| Campo que no es texto (número, booleano, objeto) | 422 `VALIDACION`, `campo` = el campo |
| Texto más largo que el máximo de la sección 1 | 422 `VALIDACION`, `campo` = el campo (con exactamente el máximo, se acepta) |
| Campo que no está en la lista de 13 (`id`, `updatedAt`, `unica`, `condicionesVentaUrl`…) | 422 `VALIDACION`, `campo` = el campo, mensaje «no se edita en esta ruta» |
| Sin `expectedUpdatedAt` (ausente) | 422 `VALIDACION`, `campo: expectedUpdatedAt` |
| Cuerpo con solo `expectedUpdatedAt`, sin ningún campo | 422 `VALIDACION` («debe indicar al menos un campo») |
| Cuerpo que no es JSON | 422 `VALIDACION` |

**Bloqueo optimista (`expectedUpdatedAt`)**:
- Si la fila existe: `expectedUpdatedAt` debe ser **exactamente** su `updatedAt` actual. Si no coincide (o es `null`): **409 `CONFLICTO_VERSION`** y no se cambia nada.
- Si la fila **no existe** (primer guardado): `expectedUpdatedAt` debe ser `null`; la API crea la fila (con `unica = 1` y un `id` nuevo) y los campos ausentes quedan a `null`. Si no es `null`: 409 `CONFLICTO_VERSION`.
- Implementación: `UPDATE … SET … WHERE id = ? AND updated_at = ?` y, si afecta a 0 filas, 409. Dos PUT simultáneos con el mismo `expectedUpdatedAt`: solo uno gana.
- Cada guardado deja `updatedAt` con la hora nueva (DATETIME(3), UTC), aunque el valor guardado sea igual al anterior.

**Respuesta 200**: exactamente igual que el GET (las 15 claves) con el `updatedAt` nuevo.

## 4. Tabla MySQL propuesta
```sql
CREATE TABLE ajustes_legales (
  id                  CHAR(36)      NOT NULL,
  unica               TINYINT(1)    NOT NULL DEFAULT 1,
  razon_social        VARCHAR(200)  NULL,
  cif                 VARCHAR(40)   NULL,
  domicilio           VARCHAR(300)  NULL,
  email_contacto      VARCHAR(200)  NULL,
  email_privacidad    VARCHAR(200)  NULL,
  telefono            VARCHAR(60)   NULL,
  registro_mercantil  VARCHAR(300)  NULL,
  alojamiento         VARCHAR(300)  NULL,
  ciudad_tribunales   VARCHAR(100)  NULL,
  portes              VARCHAR(2000) NULL,
  forma_pago          VARCHAR(2000) NULL,
  devoluciones        VARCHAR(2000) NULL,
  plazo_registros     VARCHAR(100)  NULL,
  updated_at          DATETIME(3)   NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ajustes_legales_unica_key (unica),
  CONSTRAINT ajustes_legales_una_fila CHECK (unica = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```
No he podido ejecutar este SQL contra vuestro MySQL, así que adáptalo a su versión: `CHECK` exige MySQL 8.0.16 o superior y la colación `utf8mb4_0900_ai_ci` solo existe en MySQL 8 (en MariaDB usa `utf8mb4_unicode_ci`). La columna `unica`, con índice único y siempre a 1, impide que exista una segunda fila. Los nombres de columna en `snake_case` son una propuesta tuya; el JSON va siempre en `camelCase` con los 13 nombres de la sección 1. **utf8mb4 obligatorio**: los textos llevan `ñ`, `€`, tildes y guiones largos.

## 5. Carga inicial
Una sola fila, con los valores de la columna «Valor actual» de la sección 1 (los 13 campos; los cuatro que van a `null` son `registroMercantil`, `portes`, `formaPago` y `devoluciones`, que quedan pendientes hasta que se rellenen desde el panel). El CIF correcto es `B72658198`.

## 6. Lista de verificación: ningún campo sin cubrir
Marca cada casilla antes de dar la ruta por terminada. Son 13 filas y cada fila tiene que estar en los cuatro sitios.

| Campo | Columna MySQL | GET lo devuelve | PUT lo acepta | Límite validado | Carga inicial |
|---|:-:|:-:|:-:|:-:|:-:|
| `razonSocial` | ☐ | ☐ | ☐ | ☐ 200 | ☐ |
| `cif` | ☐ | ☐ | ☐ | ☐ 40 | ☐ |
| `domicilio` | ☐ | ☐ | ☐ | ☐ 300 | ☐ |
| `emailContacto` | ☐ | ☐ | ☐ | ☐ 200 | ☐ |
| `emailPrivacidad` | ☐ | ☐ | ☐ | ☐ 200 | ☐ |
| `telefono` | ☐ | ☐ | ☐ | ☐ 60 | ☐ |
| `registroMercantil` | ☐ | ☐ | ☐ | ☐ 300 | ☐ (null) |
| `alojamiento` | ☐ | ☐ | ☐ | ☐ 300 | ☐ |
| `ciudadTribunales` | ☐ | ☐ | ☐ | ☐ 100 | ☐ |
| `portes` | ☐ | ☐ | ☐ | ☐ 2000 | ☐ (null) |
| `formaPago` | ☐ | ☐ | ☐ | ☐ 2000 | ☐ (null) |
| `devoluciones` | ☐ | ☐ | ☐ | ☐ 2000 | ☐ (null) |
| `plazoRegistros` | ☐ | ☐ | ☐ | ☐ 100 | ☐ |

Más: `id` y `updatedAt` en las respuestas; el MOCK actualizado con estos 13 campos antes de congelar el contrato (cualquier cambio de campo se registra antes de programar el PHP, §15).

## 7. Pruebas de aceptación
Las ejecuto yo contra el MOCK actualizado y después contra el PHP. Todas deben dar el resultado indicado.

| # | Prueba | Resultado esperado |
|--:|---|---|
| 1 | GET con la tabla vacía | 200; 13 campos `null`, `id: null`, `updatedAt: null` |
| 2 | GET con fila | 200; exactamente las 15 claves de la sección 2, sin ninguna más ni menos |
| 3 | GET sin `X-Request-Id` | 422 |
| 4 | PUT primer guardado con `expectedUpdatedAt: null` y los 13 campos | 200; crea la fila; el GET devuelve lo mismo |
| 5 | PUT con solo `telefono` y el `expectedUpdatedAt` correcto | 200; cambia `telefono`; los otros 12 campos intactos; `updatedAt` nuevo y mayor |
| 6 | PUT con `telefono: null` | 200; el GET devuelve `telefono: null` |
| 7 | PUT con `telefono: ""` | 200; el GET devuelve `telefono: null` |
| 8 | PUT con `expectedUpdatedAt` antiguo | 409 `CONFLICTO_VERSION`; nada cambia |
| 9 | PUT con `expectedUpdatedAt: null` cuando la fila ya existe | 409 `CONFLICTO_VERSION` |
| 10 | PUT con `expectedUpdatedAt` con valor cuando no hay fila | 409 `CONFLICTO_VERSION` |
| 11 | PUT sin `expectedUpdatedAt` | 422, `campo: expectedUpdatedAt` |
| 12 | PUT con solo `expectedUpdatedAt` | 422 |
| 13 | PUT con `id`, `updatedAt`, `unica` o `condicionesVentaUrl` | 422 (uno por prueba) |
| 14 | PUT con cada uno de los 13 campos con el máximo de caracteres | 200 (13 pruebas) |
| 15 | PUT con cada uno de los 13 campos con el máximo + 1 | 422, `campo` = ese campo (13 pruebas) |
| 16 | PUT con un número en lugar de texto en cada campo | 422 |
| 17 | PUT con `ñ`, `€`, tildes y `–` | 200; el GET devuelve los mismos caracteres, byte a byte |
| 18 | Dos PUT simultáneos con el mismo `expectedUpdatedAt` | Uno 200 y el otro 409 |
| 19 | PUT sin `X-Actor-User-Id` | 422 |
| 20 | PUT con `X-Actor-Partner-Id` y sin él | Mismo resultado (se ignora) |
| 21 | Intento de crear una segunda fila | Imposible (restricción de la tabla) |
