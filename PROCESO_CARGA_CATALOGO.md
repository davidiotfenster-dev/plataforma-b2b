# Proceso de carga del catálogo de dispositivos

Registro paso a paso de lo que se hace en la aplicación con el catálogo. Cada paso se hace por separado y se para para revisar.

## Fuentes
- Excel de GTIN: `DISPOSITIVOSIOT (3).xlsx`
- PDF de denominaciones: `DENOMINACION_DE_MARCAS_Y_DISPOSITIVOS.pdf`
- Tarifa 2026 (septiembre): `TARIFA 2026 IoT FENSTER (2).pdf`
- Documento de trabajo: `CATALOGO_DISPOSITIVOS_v3.docx` y `EQUIVALENCIAS_v3.xlsx` (Descargas)

## Paso 1 — Revisión del estado actual (hecho, solo lectura, no se cambió nada)
Estado de la base de datos:
- 14 partners (VBH, PROCOMSA y el resto de reales, más `Partner Ficticio S.L.`). **No existe un partner MySmartWindow.**
- 53 `ProductoBase` ya cargados con `npm run import:dispositivos` (script `backend/scripts/import-dispositivos.ts`, datos en `backend/scripts/data/dispositivos.json`).
- 29 `RepresentacionPartner` (asignaciones de producto a partner con precio).
- Todos los partners reales tienen descuento 0 % salvo Armando Carracedo (5 %). Solo `PROCOMSA` y `HAUSEN` tienen marca comercial asignada.

Cómo funciona lo ya hecho:
- Un aparato con varios nombres según marca es UN `ProductoBase`; los GTIN y nombres por marca van en `especificacionesJson.referencias`.
- El script NO crea `RepresentacionPartner`: la asignación con precio se hace desde el panel `admin/catalogo`.
- El partner solo ve los campos permitidos (lista blanca) y solo los nombres de su marca.
- Los archivos `import-dispositivos.ts`, `scripts/data/` y los cambios del catálogo están **sin commitear** en git.

Diferencias con las decisiones nuevas (a corregir en los pasos siguientes):
- Faltan en `ProductoBase` (según la tarifa): EVO Shutter/Security/Plus (hay uno solo, `EVO`), Connect Smart White Box, C-WALL Flex, mando bluConnect, cables y botón del Pulsar.
- Hay que revisar que Connect-1/2 estén agrupados con Wave-1/2 e Icon1/2 (mismo aparato) y Wave3 Air con C-WALL.
- Faltan precios (PVP) de la tarifa en las asignaciones.

## Pasos siguientes (pendientes, uno a uno)
2. Comprobar el `dispositivos.json` contra `EQUIVALENCIAS_v3.xlsx` y corregir agrupaciones.
3. Añadir los productos que están en la tarifa y no en la base.
4. Crear el partner MySmartWindow (necesita datos: CIF, dirección, etc.).
5. Crear las asignaciones `RepresentacionPartner` con PVP de tarifa (VBH → Wave, Procomsa → ICON, MySmartWindow → Connect).
6. Comprobar en la aplicación que cada partner ve solo su catálogo.

## Paso 2 y 3 — Corrección del fichero de datos (hecho; SOLO se cambió `backend/scripts/data/dispositivos.json`, la base de datos NO)
Copia de seguridad del fichero anterior: `backend/scripts/data/dispositivos.backup-antes-paso2.json`.
De 52 a 54 productos. Se comprobó que no se pierde ningún GTIN.

Cambios:
- **Connect = Wave = Icon:** los 10 productos Connect de MySmartWindow se fusionan con Wave1/1+/2/2+/2S e Icon1/1+/2/2+ (mismo aparato, tres nombres y tres GTIN).
- **Pulsar con cable 1,6 m (MySmartWindow):** se fusiona con Pulsar/Wave-4/Icon Mini (4 productos menos). *Suposición mía*: si es un aparato distinto por el cable, hay que separarlo.
- **Wave3 Air:** pasa a la familia C-WALL / Wave3 / ICON WALL (versión Air).
- **EVO:** el producto único `EVO` se sustituye por 12: 3 modelos (Shutter, Security, Plus) × 4 colores (Blanco, Antracita, Negro, Marrón).
- **Mando:** `MANDO-CONNECT-MASTER` pasa a llamarse Mando Witooth, con nombres bluConnect (MySmartWindow, ref BLUECTN), ICON BLUE (Procomsa) y WAVE BLUE (VBH).
- **Productos nuevos de la tarifa:** C-WALL Flex, Connect Smart White Box, botón Pulsar, cable Pulsar 1 m, cable datos EVO. El cable 2 m (`CABLE-2M-MINI`) recibe la referencia `CABLE_2M_PL`.

SKU que dejan de existir en el fichero (se borrarán de la base en el paso siguiente; ninguno tiene asignaciones a partners, comprobado):
`CONNECT1BL, CONNECT1N, CONNECT1PBL, CONNECT1PN, CONNECT2BL, CONNECT2N, CONNECT2PBL, CONNECT2PN, CONNECT2SBL, CONNECT2SN, PULSAR-C16-INOX, PULSAR-C16-NEGRO, PULSARP-C16-INOX, PULSARP-C16-NEGRO, EVO`

Descubierto al revisar las asignaciones (solo lectura):
- Las 29 asignaciones actuales son SOLO los mandos: `MANDO-CONNECT-ESTANDAR` y `MANDO-CONNECT-MASTER`, a 30 EUR, a 13 partners reales más el ficticio (no es que estén mal, pero todos ven el mismo nombre "Mando Connect").
- `MANDO-CONNECT-ESTANDAR` no aparece en la tarifa 2026. Pendiente de confirmar si existe.

## Siguiente paso (pendiente, esperando tu OK)
4. Ejecutar `npm run import:dispositivos` para actualizar la base con el JSON nuevo, y retirar los SKU obsoletos.
   Es el primer paso que cambia la base de datos.

## Decisiones tras el paso 2/3
- **Mando estándar:** existe. Se mantiene (`MANDO-CONNECT-ESTANDAR`); no figura en la tarifa 2026, precio actual 30 EUR.
- **Pulsar con cable 1,6 m:** David no lo sabe. Se DEJA SEPARADO (los 4 productos `*-C16-*` vuelven a existir) hasta confirmar; es más fácil fusionar después que separar. El fichero pasa a 58 productos y los `*-C16-*` salen de la lista de SKU a retirar.

## Paso 4 — Base de datos y botón "Asignar catálogo de una marca" (hecho)
Qué se hizo:
- **Migración** `20260929133837_pvp_tarifa_producto_base`: columna nueva `ProductoBase.pvpTarifa` (precio de tarifa, opcional). Aplicada en la base.
- **Carga** (`npm run import:dispositivos`): 58 productos, 35 con precio de tarifa. Se borraron 11 obsoletos (Connect sueltos y EVO único), ninguno tenía asignaciones. Los mandos siguen con 30 EUR.
- Nueva marca `ambito: 'todos'` en los datos para mandos, EVO, Connect Smart, cables y botón: se asignan a cualquier partner.
- **Panel del partner** (Admin → Partners → Catálogo): bloque nuevo "Asignar catálogo de una marca". Eliges Wave / ICON / Connect (se preselecciona si el partner es VBH o Procomsa) y con un clic se asignan todos los productos de esa marca con su nombre, su SKU y el precio de tarifa. Textos en es/en/de/it/pt.
- No se asigna un producto si la tarifa no tiene su precio (aparece un aviso con el número).

Comprobación (sin iniciar sesión, contra la base real): VBH → 24 productos asignables, Procomsa → 21, MySmartWindow → 22. Sin SKU duplicados. Ojo: la prueba en pantalla NO está hecha (falta contraseña de administrador).

Pendiente:
- Precio de Connect-1/2 (Wave-1/2, Icon1/2), Wave2S+, Wave3 Air, Pulsar+ y tapas: no están en la tarifa, por eso no se asignan.
- Solo VBH y Procomsa se reconocen solos; para el resto de partners hay que elegir la marca en el desplegable.
- Falta el partner MySmartWindow (no existe en la base).

Nota de despliegue: el puerto 3004 (el del túnel de Cloudflare) sirve el frontend en modo producción (`next start`); tras cambiar el frontend hay que ejecutar `npm run build` en `frontend/` y reiniciar ese servidor, o los cambios no se ven.

## Botón "Borrar" en productos asignados (hecho)
- Backend: `DELETE /partners/:id/catalogo/:repId` (ADMIN_FENSTER y COMERCIAL). Al borrar, el producto desaparece de los carritos del partner; los pedidos ya hechos conservan su "fotografía" (nombre, precio, descuento) y solo pierden el enlace al producto.
- Panel: botón rojo "Borrar" junto a "Desactivar", con confirmación. Desactivar sigue existiendo (oculta el producto sin perder la asignación).

## Mejoras de pantalla (hechas, 2026-09-29)
- **Lista de asignados compacta** (Admin → Partners → Catálogo): una fila por producto en una sola tabla, buscador por nombre/SKU, "Guardar" solo activo si hay cambios, "Borrar" discreto con confirmación (se rellena de rojo al pasar el ratón), productos desactivados atenuados con etiqueta "Inactivo". Antes "Borrar" se salía de la tarjeta.
- **Menú:** la sección activa se resalta (fondo gris claro, negrita y línea turquesa).
- **Login rediseñado:** tarjeta con franja turquesa, iconos en los campos, ojo para ver la contraseña, aviso de error con icono, indicador de carga y enlace "Solicitar acceso" al registro.
- **Componente `Marca`** (`frontend/src/components/marca.tsx`): el nombre "IoT FENSTER Portal Partner" con la misma tipografía en la barra superior y en un pie de página nuevo. Se probó también sobre la tarjeta del login y se quitó por repetido.
- Textos nuevos en es/en/de/it/pt.

## Comprobación de seguridad (hecha, 2026-09-30)
24 pruebas contra el backend local (`localhost:3010`) con las cuentas de prueba de `SETUP.md`: **23 correctas, 1 fallo**.
- Correcto: cookie `HttpOnly` y `Secure`; `DELETE` de asignaciones (401 sin sesión, 403 como partner, 404 con id inexistente o de otro partner, 400 con id mal formado o inyección SQL); el partner no puede entrar en `/productos-base` ni `/partners`; el catálogo del partner (22 productos revisados) no filtra `productoBaseId`, `skuIndustrial`, `nombreTecnico`, `pvpTarifa`, `referencias`, `gtin` ni `especificacionesJson`; un comercial no puede borrar en un partner ajeno; precio negativo y campo extra `partnerId` rechazados con 400.
- Fallo: la cookie sale con `SameSite=None` porque `backend/.env` tiene `COOKIE_SAME_SITE="none"` para la demo por túnel. En producción debe ser `strict` (es el valor por defecto si la variable no existe).
- No probado: pantallas con clics (asignar por marca, borrar), fuerza bruta en el login y revisión de cabeceras de Helmet.

## Demo por túnel (2026-09-30)
Tras reiniciarse el equipo, se recrearon los dos túneles de Cloudflare. URLs nuevas en `CONTEXTO_SESION.md`; `backend/.env` (`FRONTEND_URL`) y `frontend/.env.local` (`NEXT_PUBLIC_API_URL`) actualizados, frontend recompilado. Verificado desde fuera: frontend 200, backend 401 sin sesión y CORS correcto. **Al terminar la demo hay que devolver los `.env` a local** y cambiar la contraseña de la cuenta de administrador de prueba, que está escrita en `SETUP.md`.

## Git y GitHub
- Commits locales (rama `master`): `e2aaf9f` backend, `50b2d9e` frontend, `578eb8c` documentación, `868e0ba` README del proyecto.
- Remoto: `https://github.com/davidiotfenster-dev/plataforma-b2b.git` (privado). Se cambió de SSH a HTTPS porque el equipo no tiene clave SSH registrada. `main` en GitHub está en `578eb8c`; falta subir el README: `git push origin master:main`.
- No hace falta PR si se trabaja en solitario.
- Queda sin guardar en git `backend/scripts/data/dispositivos.backup-antes-paso2.json` (copia temporal, se puede borrar).

## Pendiente (resumen)
1. Precio de tarifa de Connect-1/2 (Wave-1/2, Icon1/2), Pulsar+, Wave2S+, Wave3 Air y tapas ICON.
2. GTIN de EVO, Connect Smart, C-WALL Flex, mandos y cables.
3. Confirmar si el Pulsar con cable de 1,6 m de MySmartWindow es el mismo aparato que el Pulsar normal (ahora separado).
4. Crear el partner MySmartWindow (necesita CIF y dirección) y guardar la marca en la ficha de cada partner.
5. Asignación automática del catálogo al aprobar un partner nuevo.
6. Probar en pantalla el botón "Asignar catálogo de una marca" y "Borrar".

## Datos de PRUEBA en el catálogo (2026-09-30) — hay que sustituirlos por los reales
Para poder probar el panel de un partner con todo el catálogo, se rellenó lo que faltaba en `dispositivos.json` y se cargó en la base (`npm run import:dispositivos`: 0 creados, 58 actualizados). Cada producto tocado lleva el campo `datosDePrueba` en el JSON.
- **Precio de prueba 50 EUR** (`pvpTarifa`) en 23 productos sin precio en la tarifa: Connect/Wave/Icon 1, 1+, 2, 2+, 2S y 2S+ (12), tapas ICON (4), Pulsar+ (2), Wave3 Air (3) y Pulsar+ con cable 1,6 m (2).
- **GTIN de prueba `TEST000000001`…`TEST000000022`** en las referencias que no tenían GTIN: cable 2 m (2 marcas), mando Witooth (3 marcas), EVO ×12, C-WALL Flex, Connect Smart White Box, botón Pulsar, cable Pulsar 1 m y cable datos EVO.
- Para localizarlos: buscar `TEST0000` en el buscador del catálogo o `datosDePrueba` en el JSON. Al tener los datos reales, cambiarlos en el JSON y volver a cargar.

## Botón "Borrar todos" en el catálogo del partner (2026-09-30)
- Backend: `DELETE /partners/:id/catalogo` (ADMIN_FENSTER y COMERCIAL, mismas restricciones que el borrado individual). Borra todas las asignaciones del partner; desaparecen de sus carritos y los pedidos hechos conservan su "fotografía".
- Panel (Admin → Partners → Catálogo): botón rojo "Borrar todos (N)" junto al título "Productos asignados", con confirmación. Solo aparece si hay productos asignados. Textos en es/en/de/it/pt.
- Los botones existentes (asignar por marca, borrar uno, desactivar) se mantienen. Pendiente de probar en pantalla; hay que reiniciar el backend y recompilar el frontend.

## Imágenes de producto gestionables por el admin (2026-09-30)
- Base de datos: columna nueva `ProductoBase.imagenUrl` (migración `imagen_producto_base`). Una foto por aparato, la misma para las 3 marcas; `RepresentacionPartner.imagenUrl` tiene prioridad si existe.
- Backend: `GET /imagenes/:archivo` (público, nombres UUID v4; solo png/jpg/webp), `POST /productos-base/imagen` (multipart `archivo` + `ids`, uno o varios productos) y `DELETE /productos-base/imagen` (`{ids}`), solo ADMIN_FENSTER. Se valida por los bytes del archivo, máximo 3 MB; se borra del disco la subida que ya no usa nadie.
- Archivos: `backend/uploads/productos/` (variable `UPLOADS_DIR`). Las 6 fotos de serie `default-*.png` van en git; las subidas por el admin no.
- Fotos de serie: connect-1 (1 y 1+), connect-2 (2, 2+, 2S, 2S+), pulsar (Pulsar, Pulsar+, cable 1,6 m, botón), c-wall (pulsadores de pared y Flex), evo (12 EVO) y mando. Sin foto: tapas ICON, cables, White Box.
- `import:dispositivos` solo pone la foto de serie al CREAR un producto; nunca pisa lo que haya cambiado el admin.
- Panel (Admin → Catálogo): miniatura en cada fila; en el detalle, "Subir/Cambiar imagen" y "Quitar imagen"; con varios seleccionados, los mismos botones en la barra inferior.
- Grupos del catálogo plegables (clic en la cabecera) y botón "Plegar todo / Desplegar todo".

## Partners y clientes (2026-09-30)
- Base de datos: `Partner.tipo` (PARTNER / CLIENTE, por defecto CLIENTE) y `Partner.marcaCatalogo` (VBH / PROCOMSA / MYSMARTWINDOW, por defecto MYSMARTWINDOW). Migración `tipo_empresa_y_marca_catalogo`.
- Script `backend/scripts/migrar-partners-clientes.ts` (idempotente, ya ejecutado): VBH y Procomsa → partner con su marca; se crea el partner **MySmartWindow** con datos provisionales (`PENDIENTE-MYSMARTWINDOW`, sale como "datos por completar") y 42 productos Connect a PVP de tarifa; las otras 12 empresas quedan como clientes con marca MySmartWindow.
- Los pulsadores de pared con marca "C-WALL" cuentan como marca MySmartWindow; sus nombres pasan a "C-WALL SKY" / "C-WALL SHUTTER" (antes los dos "Pulsador empotrable en pared").
- Admin: el menú "Partners" pasa a "Empresas". La lista muestra arriba las tarjetas de los partners (color por marca, productos, pedidos, descuento) y debajo la tabla de clientes con su marca. En la ficha: insignias Partner/Cliente y marca; en "Datos → Comercial" se eligen el tipo y la marca. El botón "Asignar catálogo de una marca" usa la marca de la ficha.
- Pendiente: catálogo por marca (hoy cada empresa sigue con su lista propia; a los clientes no se les ha asignado aún el catálogo Connect), respuestas de dirección (documento "Portal B2B: partners y clientes") y datos reales de MySmartWindow.

## Catálogo por marca (2026-09-30)
- Base de datos: tabla nueva `ProductoMarca` (marca, producto base, SKU, nombre, PVP, activo) = catálogo de cada submarca; `RepresentacionPartner.productoMarcaId` enlaza la fila de cada empresa con su producto de marca (nulo = producto extra asignado a mano). Migración `catalogo_por_marca`. Copia de la base antes del cambio: `%TEMP%/backups/fenster-antes-catalogo-marca.dump` (`pg_dump -Fc`).
- Backend: módulo `catalogo-marca` (`GET /catalogos-marca/:marca`, `POST :marca/productos`, `POST :marca/rellenar`, `PATCH|DELETE productos/:id`, solo ADMIN_FENSTER). Cada cambio se aplica al momento a todas las empresas de la marca (`sincronizarEmpresa`). También se sincroniza al crear una empresa, al aprobarla y al cambiarle la marca.
- Reglas: en una empresa, los productos de su marca solo admiten descuento y ocultar (400 si se intenta renombrar, cambiar SKU/PVP o borrar); los extras se gestionan como antes. Lo oculto en la marca desaparece para todas sus empresas y no se puede pedir. "Borrar todos" pasa a "Borrar extras".
- Cambiar la marca de una empresa: salen los productos de la marca anterior (también de su carrito; los pedidos no cambian) y entran los de la nueva. Un extra del mismo producto que uno de la nueva marca pasa a ser de la marca (y se va si luego cambia otra vez de marca).
- Carga inicial (`npx tsx scripts/poblar-catalogos-marca.ts`, idempotente): Wave 41, ICON 35, Connect 42 productos; todas las empresas enlazadas. Los 12 productos Wave que el Partner Ficticio (cliente MySmartWindow) tenía a mano desaparecieron en la prueba de cambio de marca.
- Pantallas: menú nuevo "Marcas" (Catálogos de marca: tarjeta por marca con productos y empresas, tabla editable, "Añadir lo que falta" y productos que faltan con nombre propuesto). Catálogo de cada empresa: aviso de su marca, "Productos de su marca" (descuento y ocultar) y "Productos extra". Lista de Empresas más ancha y con los clientes también en tarjetas (borde del color de su marca).
- Probado contra el backend local (13 comprobaciones: propagación de PVP, ocultar, carrito, permisos, cambio de marca, sin fuga de campos internos). Pantallas sin probar con clics.

## Prueba completa por roles (2026-09-30)
- Se probó contra una copia local (backend en 3011 y frontend en 3006, misma base de datos, sin túnel), para no teclear contraseñas en una web externa. Los datos de prueba ("PRUEBA-AUTO": 2 empresas y 2 pedidos) se borraron al terminar.
- API: 83 comprobaciones de admin, comercial y cuenta de empresa, 82 correctas; la única fallida era un error de la prueba (el catálogo global tiene 59 productos base, no 58, por `IND-VENTANA-001`).
- Pantallas: admin (Empresas, Marcas con cambio de precio guardado y revertido, cambio de marca desde la ficha, Productos, Pedidos, Estadísticas), comercial (solo ve su cliente, menú Empresas y Pedidos) y cliente (catálogo por modelo con color, carrito, checkout y pedido PED-000120; vista móvil sin scroll horizontal).
- Corregido tras la prueba: Marcas, Productos y Estadísticas muestran "solo para administradores" si entra un comercial por URL (antes se quedaban cargando); el enlace "Editar el catálogo de la marca" y la sección Partners vacía ya no le salen al comercial; textos "Todas las empresas" y "Descuento general de la empresa"; tarjetas del catálogo más anchas en el móvil.
- Arreglado después: las etiquetas de checkout, registro, recuperar y restablecer contraseña están enlazadas a sus campos (y los errores se anuncian con `role="alert"`).
- Numeración de pedidos sin huecos: ya no usa la secuencia `pedido_codigo_seq` (migración `numeracion_pedidos_sin_huecos` la borra). El código es el último PED existente + 1, calculado dentro de la transacción con un bloqueo de PostgreSQL (`src/pedidos/codigo-pedido.ts`). Una confirmación fallida no gasta número y, tras borrar los últimos pedidos, sus números se reutilizan. Probado con 5 confirmaciones simultáneas: PED-000007 a PED-000011, distintos y seguidos. El siguiente pedido real será PED-000007.

## Barra superior (2026-09-30)
- "Salir" es un botón con borde (rojo al pasar el ratón o con el teclado) y queda siempre arriba a la derecha.
- Escritorio (≥1280 px): una fila → marca | secciones | idioma + Salir. Tablet (768–1279 px): fila 1 marca … idioma + Salir, fila 2 secciones. Móvil: fila 1 marca … Salir, debajo secciones e idioma.
- El email del usuario ya no se escribe en la barra (no cabía): está en el tooltip de "Salir" y en su etiqueta para lectores de pantalla.
- Medido con admin en 1440, 1280, 1024, 768 y 375 px: sin scroll horizontal y cada bloque en su fila.
