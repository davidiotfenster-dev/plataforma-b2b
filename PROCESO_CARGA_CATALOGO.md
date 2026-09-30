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
