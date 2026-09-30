# Contexto de la sesión en curso (actualizado 2026-09-30)

## 0. ESTADO AL 2026-09-30 — leer primero

**Resumen de una línea**: el portal distingue ya **partners** (VBH, Procomsa,
MySmartWindow, con submarca propia) y **clientes** (el resto, que ven los
dispositivos de la marca de un partner; MySmartWindow por defecto). Hay un
**catálogo único por marca** que se aplica solo a todas sus empresas. Todo
probado con los 3 roles. Lo de "Mis pedidos" (0.8) está sin commitear; lo
anterior ya está en git (ver 0.6). Detalle paso a paso en `PROCESO_CARGA_CATALOGO.md`.

### 0.1 Modelo de negocio (decidido por David)
- **Partner** = empresa que compra volumen y tiene submarca propia: VBH → Wave,
  Procomsa → ICON, MySmartWindow → Connect. Su marca es fija.
- **Cliente** = todos los demás distribuidores / clientes finales. Ven el
  catálogo de UNA marca; por defecto MySmartWindow (Connect), el admin la puede
  cambiar (p. ej. un cliente del norte a VBH).
- Un mismo aparato se llama distinto según la marca (Connect-1 = Wave-1 =
  Icon1): es UN `ProductoBase` con los nombres/GTIN por marca en
  `especificacionesJson.referencias`. NO se separa (se probó y se deshizo).
- Precio = PVP de tarifa − descuento de la empresa (con excepciones por
  producto). Un catálogo por marca; por empresa solo descuento y ocultar.
- **Pendiente de dirección** (documento para el jefe, con las preguntas):
  https://claude.ai/code/artifact/7affca0c-a1a9-4d5d-a0e0-2ccddcbff17d
  La clave es la pregunta 1: ¿el cliente compra a IoT FENSTER directamente o a
  través del partner (el partner ve sus clientes/pedidos)? Hasta que responda,
  el partner NO ve nada de los clientes de su marca.

### 0.2 Qué hay implementado hoy (backend + frontend)
- **Base de datos** (5 migraciones nuevas, ya aplicadas en local; la 5ª, `historial_estados_pedido`, es de 0.8):
  `imagen_producto_base` (`ProductoBase.imagenUrl`),
  `tipo_empresa_y_marca_catalogo` (`Partner.tipo` PARTNER/CLIENTE y
  `Partner.marcaCatalogo` VBH/PROCOMSA/MYSMARTWINDOW),
  `catalogo_por_marca` (tabla `ProductoMarca` + `RepresentacionPartner.productoMarcaId`),
  `numeracion_pedidos_sin_huecos` (borra la secuencia `pedido_codigo_seq`).
- **Catálogo por marca**: módulo `backend/src/catalogo-marca/`. Cada cambio en
  la marca se sincroniza al momento a todas sus empresas (`sincronizarEmpresa`),
  también al crear, aprobar o cambiar de marca una empresa. En una empresa, los
  productos de su marca solo admiten descuento y ocultar; los "extras" a mano
  siguen como antes. Carga inicial: Wave 41, ICON 35, Connect 42 productos.
- **Imágenes de producto** gestionables por el admin (subir/cambiar/quitar,
  una o varias a la vez): `GET /imagenes/:archivo` (público, nombres UUID),
  `POST|DELETE /productos-base/imagen`. Archivos en `backend/uploads/productos/`
  (las 6 de serie `default-*.png` van en git, las subidas NO → incluir esa
  carpeta en las copias de seguridad).
- **Numeración de pedidos sin huecos**: `src/pedidos/codigo-pedido.ts` (último
  PED + 1 con bloqueo de PostgreSQL). **El siguiente pedido será PED-000007.**
- **Pantallas admin**: menú "Partners" → **"Empresas"** (tarjetas: partners
  arriba, clientes debajo, borde del color de su marca); menú nuevo **"Marcas"**
  (catálogo de cada submarca, editable, "Añadir lo que falta"); ficha de
  empresa con tipo y marca en Datos → Comercial; catálogo de la empresa con
  "Productos de su marca" + "Productos extra" + "Borrar extras"; catálogo
  global (Productos) con miniaturas, subir imagen, grupos plegables cerrados
  por defecto y vista "Aparato | Marca". Marcas, Productos y Estadísticas
  muestran "solo para administradores" a un comercial.
- **Pantallas del cliente**: catálogo en tarjetas grandes, una por modelo, con
  círculos de color para elegir variante; imagen del aparato.
- **Barra superior**: "Salir" como botón con borde (rojo al pasar el ratón),
  siempre arriba a la derecha. Escritorio ≥1280 px: una fila; tablet: marca +
  idioma + Salir arriba y secciones debajo; móvil: marca + Salir arriba. Encima
  de la barra hay una franja fina con "Sesión iniciada como <email> · <empresa
  o rol>" (para saber con qué cuenta se ha entrado); el email sigue también en
  el tooltip de "Salir".
- Accesibilidad: etiquetas enlazadas a sus campos en checkout, registro,
  recuperar y restablecer contraseña.

### 0.3 Datos (base local)
- 3 partners: VBH, Procomsa ("Procedimientos de construc. Moderna S.A.") y
  **MySmartWindow** (creado hoy con datos PROVISIONALES:
  `PENDIENTE-MYSMARTWINDOW`, sin usuario de acceso → completar su ficha).
- 12 clientes, todos con marca MySmartWindow (incluido el "Partner Ficticio
  S.L." de pruebas, cuyo login es `partner@fenster.test`).
- **Datos de PRUEBA en el catálogo** (hay que sustituirlos por los reales):
  PVP 50 € en 23 productos sin precio de tarifa y GTIN `TEST000000001`…`022`.
  Marcados con `datosDePrueba` en `backend/scripts/data/dispositivos.json`.
- 2 pedidos (PED-000004 y PED-000006) del Partner Ficticio.
- Copia de seguridad de la base de antes del catálogo por marca:
  `%TEMP%\backups\fenster-antes-catalogo-marca.dump` (formato `pg_dump -Fc`).

### 0.4 Scripts nuevos (idempotentes)
- `npx tsx scripts/migrar-partners-clientes.ts` — clasifica partners/clientes
  y crea MySmartWindow (ya ejecutado).
- `npx tsx scripts/poblar-catalogos-marca.ts` — rellena los catálogos de marca
  y sincroniza todas las empresas (ya ejecutado).
- `npm run import:dispositivos` — recarga `dispositivos.json` (solo pone la
  foto de serie al CREAR un producto; nunca pisa lo cambiado por el admin).

### 0.5 Servidores ahora mismo
- Backend: `node dist/main` en **3010** (compilado, NO en modo watch: tras
  cambiar backend → `npm run build` en `backend/` y reiniciar).
- Frontend: `next start -p 3004` (producción, por el túnel: tras cambiar
  frontend → `npm run build` en `frontend/` y reiniciar).
- Los arranqué yo en segundo plano; si se reinicia el equipo hay que volver a
  lanzarlos (sección 8) y recrear los túneles (sección 2).
- Puertos ocupados por OTRO proyecto (no tocar): 3000 y 3005 (pm2
  `panel-ventanas` / `panel-ventanas-dev`).
- Para probar con login SIN pasar por el túnel se usó una copia local:
  backend en 3011 (`PORT=3011 FRONTEND_URL=http://localhost:3006
  COOKIE_SAME_SITE=strict node dist/main`) y frontend `next dev -p 3006` con
  `NEXT_PUBLIC_API_URL=http://localhost:3011` (el modo dev compila en
  `.next/dev` y no pisa el build del 3004). Ahora están parados.

### 0.6 Git
- Último commit: `523913b`, ya en `origin/master`. Lo de antes de 0.8 se
  commiteó en 5 commits (imágenes, numeración de pedidos, barra superior,
  documentación y el grande de partners/clientes/catálogo por marca). Por
  compartir archivos, solo el último compila por separado.
- **Sin commitear**: todo lo de 0.8 ("Mis pedidos"). Pídelo y se hace.
- `backend/scripts/data/dispositivos.backup-antes-paso2.json` sigue sin
  guardar en git (copia temporal, se puede borrar).
- Remoto: `https://github.com/davidiotfenster-dev/plataforma-b2b.git`.

### 0.7 Pendientes
1. Respuestas del jefe (documento de 0.1), sobre todo la pregunta 1.
2. Datos reales de MySmartWindow (CIF, dirección, dominio, usuario).
3. Precios y GTIN reales para sustituir los de prueba (0.3).
4. Confirmar si el Pulsar con cable 1,6 m es el mismo aparato que el Pulsar.
5. Fotos de tapas ICON, cables y Connect Smart White Box (se suben desde
   Admin → Productos).
6. Al aprobar un registro público, el diálogo no pide marca ni tipo: queda
   cliente MySmartWindow y se cambia luego en la ficha (valorar añadirlo).
7. Commitear lo de 0.8. Al terminar la demo: devolver los `.env`
   a local y cambiar la contraseña del admin de prueba.
8. Cuidado: si se cambia un cliente de marca y se devuelve, los extras que
   coincidían con productos de la otra marca desaparecen (así pasó con 12
   productos Wave del Partner Ficticio).

### 0.8 "Mis pedidos" del cliente (mejorado el 2026-09-30, sin commitear)
- **Historial de estados**: tabla `PedidoEstadoHistorial` (migración
  `20260930160000_historial_estados_pedido`). Se escribe al confirmar (RECIBIDO)
  y en cada cambio de estado. Los pedidos que ya existían se rellenaron desde
  el registro de auditoría. En la línea de tiempo cada paso enseña la PRIMERA
  vez que se alcanzó (un cambio forzado hacia atrás no desordena las fechas).
- **Lista** (`/pedidos`): contadores (en curso, enviados 7 días, total),
  buscador (PED, PO Number, producto o SKU), filtro por estado con contador,
  fechas desde/hasta, orden (fecha o total), paginación de 10, resumen de
  productos y enlace de seguimiento en cada fila; tarjetas en móvil.
  `GET /pedidos` ahora devuelve `{data,total,page,limit,resumen}` (antes un
  array) y no expone `partnerId` ni `userId`.
- **Detalle** (`/pedidos/[id]`): línea de tiempo (vertical en móvil), aviso de
  cancelación con fecha y motivo, PVP y descuento por línea, "Descargar PDF"
  (`GET /pedidos/:id/pdf`, 404 opaco si es ajeno) y "Repetir pedido"
  (`POST /carrito/repetir/:pedidoId`: mete las líneas en el carrito con el
  precio de HOY y avisa de los productos que ya no están y de los precios que
  han cambiado; oculto para PARTNER_CONSULTA).
- Los emails de cambio de estado ya existían (no hay que hacer nada).
- Probado con el cliente de pruebas: lista, filtros, búsqueda, detalle, PDF,
  repetir, cancelación y móvil. Datos de prueba borrados; 55 tests backend en
  verde. Servidores 3010/3004 reiniciados con el código nuevo.
- **PDF del pedido rediseñado** (el que se envía por email al confirmar y el que
  se descarga en "Descargar PDF"): banda azul marino con el logo, panel con
  cliente / PO / fecha / dirección, notas, tabla con referencia, producto,
  cantidad, PVP, descuento, neto y total, total destacado y pie con "Página x de
  y"; varias páginas con cabecera repetida si hay muchas líneas. Código en
  `backend/src/common/pdf/pedido-pdf.service.ts`. El logo es
  `backend/assets/logo-iot-fenster.png` (recortado del PNG "AzulBlanco sin
  fondo"; su "FENSTER" es blanco, por eso va sobre banda oscura). Si falta el
  archivo, el PDF sale con el nombre en texto.
- **PDF en 5 idiomas** (es/en/de/it/pt): rótulos, fechas e importes por idioma en
  `backend/src/common/pdf/pedido-pdf.textos.ts` (en inglés `€1,234.50`, en el
  resto `1.234,50 €`). `GET /pedidos/:id/pdf?idioma=DE` (400 si el valor no es
  válido; sin parámetro usa el idioma guardado del usuario). En la pantalla,
  "Descargar PDF" abre un menú "Idioma del PDF" con el idioma actual primero
  (`frontend/src/components/descargar-pdf.tsx`). El email de confirmación
  adjunta el PDF en el idioma del destinatario. Los nombres de producto y la
  dirección no se traducen (son datos).
- Foto del producto en cada línea del detalle (la del catálogo actual; sin foto
  si el producto ya no está).
- No hecho (ideas): IVA/base imponible en el detalle (el pedido no guarda el
  IVA vigente al confirmar, habría que congelarlo primero) y filtro por varios
  estados a la vez.

---

# Contexto anterior (2026-09-29)

Este archivo es un "volcado" del estado exacto de esta sesión de trabajo con
Claude Code, para poder retomarla igual tras un `/clear` o desde otra
cuenta/máquina si hace falta. Es información **temporal** (a diferencia de
`SETUP.md`, `TAREAS.md`, `DECISIONES.md` y `PROGRESO.md`, que son
documentación permanente del proyecto) — bórralo cuando ya no lo necesites.

**Resumen de una línea**: repo git creado y con 3 commits, demo en vivo
funcionando por túnel de Cloudflare, ficha cliente completa + rol Comercial
+ validaciones de formato ya implementados y verificados. Nada roto, nada a
medias ahora mismo.

## 1. Repositorio Git

- Se inicializó `git init` en la raíz del proyecto (antes no había repo).
- **No hay ningún remoto configurado** (no está en GitHub/GitLab/etc., solo
  local). Si quieres subirlo a algún sitio, decide primero dónde (GitHub
  privado, etc.) y lo configuramos.
- `frontend/` tenía su propio `.git` interno (de cuando se creó con
  `create-next-app`, con un único commit sin remoto) — se movió a
  `_frontend-git-backup-do-not-need/` en la raíz (no se borró, por si acaso;
  está en `.gitignore` para que no moleste). Se puede borrar con seguridad
  cuando quieras.
- A partir de ahora, cada cambio importante debería ir con su propio commit
  (pídemelo explícitamente cuando quieras que lo haga, no lo hago solo).
- **Commits hechos hasta ahora** (`git log --oneline`):
  1. Commit inicial: plataforma B2B IoT FENSTER (backend + frontend completos
     tal como estaban al empezar esta sesión).
  2. Preparar demo por túnel de Cloudflare (cookie `SameSite` configurable,
     `frontend-prod` en `launch.json`, este mismo archivo de contexto).
  3. Ficha cliente + rol COMERCIAL con partners acotados por
     `creadoPorUsuarioId` (ver sección 4).
  4. Formulario de alta de partner completado (le faltaban campos respecto
     al de edición) + validaciones de formato en correo/teléfono/dominio/
     código postal (ver sección 5).

## 2. Túneles de Cloudflare (para que tu compañero vea la web en vivo)

Arrancados con `cloudflared tunnel --url http://localhost:<puerto>` (túneles
"quick", sin cuenta de Cloudflare — gratis pero con URL aleatoria que
**cambia cada vez que se reinicia el túnel**, y sin garantía de uptime).

- **Frontend (lo que debe abrir tu compañero):**
  `https://conferencing-oaks-onion-cordless.trycloudflare.com`
- **Backend (uso interno, el frontend lo llama solo):**
  `https://dating-tolerance-nano-history.trycloudflare.com`

Si alguno de los dos procesos `cloudflared` se cae, hay que relanzarlo y
**volver a actualizar las URLs** en los sitios del punto 3 (las URLs nuevas
serán distintas a las de arriba).

**Importante — el frontend va en modo producción, no en modo desarrollo.**
Se probó primero con `npm run dev` normal y la página se quedaba colgada en
"Cargando…" sin parar: el WebSocket de HMR (recarga en caliente) de Next.js
no consigue conectar a través del túnel y esto provoca recargas de página en
bucle. Solución: se compiló el frontend en modo producción
(`npm run build --prefix frontend`) y se sirve con `npm run start` en vez de
`npm run dev` (nueva configuración `frontend-prod` en `.claude/launch.json`,
mismo puerto 3004). **Consecuencia práctica: cada vez que se cambie código
del frontend, hay que volver a compilar y reiniciar** para que tu compañero
vea el cambio (no hay recarga en caliente); el backend sí sigue en modo
watch normal, esos cambios sí se recargan solos.

```bash
cd frontend && npm run build
```

(y luego reiniciar el proceso `frontend-prod`)

Comandos para relanzar manualmente si hiciera falta (dos terminales, o dos
procesos en segundo plano):

```bash
cloudflared tunnel --url http://localhost:3010
```

```bash
cloudflared tunnel --url http://localhost:3004
```

## 3. Cambios de configuración necesarios para que el túnel funcione

Como el frontend y el backend quedan en dos dominios distintos
(`*.trycloudflare.com` con subdominios distintos), hubo que tocar tres cosas.
**Si dejas de usar el túnel y vuelves a trabajar solo en local, hay que
deshacer estos tres cambios** (o al menos los dos primeros; el tercero es
código, no hace falta deshacerlo, solo no usar la variable):

1. `backend/.env` → `FRONTEND_URL` apunta ahora a la URL del túnel del
   frontend (antes: `http://localhost:3004`). Controla el CORS del backend.
2. `backend/.env` → nueva variable `COOKIE_SAME_SITE="none"`. Sin esto, la
   cookie de sesión (`fenster_session`) no viaja entre los dos dominios y el
   login parece "no funcionar" (se queda en blanco o da 401 en `/auth/me`
   tras el login). En local, sin esta variable (o puesta a `strict`), sigue
   funcionando exactamente igual que siempre.
3. `frontend/.env.local` → `NEXT_PUBLIC_API_URL` apunta ahora a la URL del
   túnel del backend (antes: `http://localhost:3010`). Esta variable se
   "hornea" en el arranque del `next dev`, así que si la cambias hay que
   **reiniciar el proceso del frontend** (no basta con guardar el archivo).

Código nuevo (no es solo config): `backend/src/auth/strategies/jwt.strategy.ts`
exporta `cookieSameSite()`, que lee `COOKIE_SAME_SITE` y por defecto (si no
está la variable, o vale otra cosa) devuelve `'strict'` — o sea que en
producción, si nunca se pone esta variable, el comportamiento no cambia.

## 4. Ficha cliente + rol Comercial — YA IMPLEMENTADO

Ambos quedaron completados y verificados en esta sesión (backend + frontend +
navegador vía túnel, tests backend en verde):

**Campos de la "FICHA CLIENTE"**: añadidos al modelo `Partner` (teléfonos,
dirección desglosada, dirección de envío por defecto, correos de contacto,
forma de pago, divisa, IVA), migración `20260929100519_ficha_cliente_y_rol_comercial`
aplicada, DTO/servicio/formulario de edición (`admin/partners`) y traducciones
(5 idiomas) actualizados.

**Rol `COMERCIAL`**: alcance decidido y confirmado —
- Solo ve/gestiona los partners que él mismo ha dado de alta
  (`Partner.creadoPorUsuarioId`, comprobado en cada endpoint; un partner ajeno
  responde 404 opaco, igual que el resto del sistema Zero-Trust).
- Puede asignar catálogo y descuentos a sus partners (igual que admin).
- Ve pedidos solo de sus partners (`GET /pedidos/admin/resumen-por-partner`,
  `.../por-partner/:id`, `.../:id`), **sin** dashboard de estadísticas.
- **No** puede aprobar/rechazar altas por registro público (solo admin), ni
  gestionar cuentas de usuario de un partner (activar/desactivar, forzar
  logout, reset de contraseña — sigue siendo solo `ADMIN_FENSTER`).
- Nuevo endpoint `POST /partners` (alta directa, ACTIVO de inmediato, crea
  también el primer usuario `PARTNER_ADMIN`) — usable por `ADMIN_FENSTER` y
  `COMERCIAL`. Botón "Nuevo partner" en `admin/partners`.
- Usuario de prueba: `comercial@fenster.test` / `Fenster2026!` (creado con
  `npm run seed:comercial`, documentado en `SETUP.md`).
- **Bug encontrado y corregido de paso**: `AuthService.validarCredenciales`
  asumía que solo `ADMIN_FENSTER` no tiene partner asociado y bloqueaba el
  login de cualquier otro rol sin partner — bloqueaba a COMERCIAL con
  "Credenciales inválidas". Corregido para tratar `ADMIN_FENSTER` y
  `COMERCIAL` igual (personal interno, sin partner).

## 5. Formulario de alta de partner + validaciones — YA IMPLEMENTADO

David detectó que el formulario de "Nuevo partner" no tenía todos los campos
que sí tiene "Editar" (los de la ficha cliente: teléfonos, dirección
desglosada, dirección de envío, correos, forma de pago, divisa, IVA). Ya
está corregido: ambos formularios tienen exactamente los mismos campos.

De paso pidió validación para reducir errores al teclear. Implementado en
`backend/src/partners/dto/validadores-ficha-cliente.ts` (usado por
`crear-partner.dto.ts` y `actualizar-partner.dto.ts`):
- **Correos** (`correoContacto1/2`, `correoFacturacion`, `emailUsuario`):
  `@IsEmail()`, formato real de email.
- **Teléfonos** (`telefono1/2`): solo dígitos/espacios/guiones/paréntesis y
  un `+` inicial opcional, 6-20 caracteres. Deliberadamente permisivo (no
  exige prefijo de país) para no romper la entrada de números reales del
  ERP como `954351212`.
- **Dominio web**: debe tener al menos un punto y no llevar espacios ni
  `http://`, para que no se cuele por error una URL completa o el nombre de
  la empresa.
- **Código postal** (`codigoPostal`, `codigoPostalEnvio`): alfanumérico
  corto (3-10 caracteres).
- **CIF: deliberadamente SIN validar el formato.** Un CIF español real tiene
  un patrón estricto, pero forzarlo rompería el convenio ya usado de
  `PENDIENTE-<código>` para los partners reales aún sin CIF definitivo (ver
  sección de partners reales en `PROGRESO.md`). Si en el futuro se quiere
  validar, habría que excluir explícitamente ese prefijo.
- Frontend: los inputs de correo/teléfono llevan `type="email"`/`type="tel"`
  (ayuda del navegador), y el mensaje de error del backend se muestra tal
  cual en el formulario si falla la validación.

Probado con curl (teléfono con letras → 400, email inválido → 400, dominio
con espacios → 400, todo válido → 201) y visualmente en el navegador por el
túnel (mensaje de error visible en el formulario, partner no se crea).

## 5bis. Aviso: acentos/ñ corrompidos si se usa `curl` con heredoc en este shell

Al rellenar los datos reales de **PTA HERRAJES SL** (código 3949) desde una
ficha ERP, un `PATCH` hecho con `curl` + heredoc de Bash en este entorno
corrompió los caracteres con tilde/ñ (p. ej. "España" se guardó como
"Espa�a" — comprobado que era corrupción real en la base de datos, no solo
un problema de cómo se veía en la terminal). **Corregido para PTA**, pero
si se rellenan más partners reales con acentos: usar `node` con `fetch`
(login + PATCH) en vez de `curl` con el JSON inline, o escribir el JSON a un
archivo con la herramienta Write (UTF-8 seguro) y pasarlo con
`curl --data-binary @archivo.json`. Revisar visualmente en el navegador tras
guardar cualquier dato con tildes.

## 6. Ideas pendientes de valorar (no pedidas todavía)

Nada bloqueante ahora mismo. Decidir si el `COMERCIAL` debería también poder
cambiar el estado de un pedido (hoy solo puede verlos, no tocarlos).

## 6bis. Datos reales de los 13 partners — YA COMPLETADO (solo falta VBH)

David compartió fichas ERP (capturas en `Downloads\fichas clientes\`) de 12
de los 13 partners reales. Ya están todos rellenados con sus datos reales
(razón social, CIF, dirección completa, teléfonos, correos de contacto y
facturación, forma de pago, divisa, IVA, tarifa) vía `PATCH /partners/:id`
(usando `node` con `fetch`, no `curl`, por el aviso de la sección 5bis).

**Solo queda pendiente `VBH` (código 2537)** — no se compartió su ficha, sigue
con datos `PENDIENTE-2537` / `vbh.pendiente.test`. Rellenar en cuanto llegue
su ficha, con el mismo procedimiento.

En 3 partners (Armando Carracedo, AEDOS, BIEMME FINESTRE) el dominio web y
el email de acceso se dejaron **a propósito** como placeholder
(`*.pendiente.test`) aunque ya se conoce el dominio de correo real de sus
contactos — es una decisión de negocio (quién tendrá login) que no me
correspondía tomar sola. Igual que con PTA/Suministros Alcantarilla.

Casos con matices que David debería revisar cuando pueda:
- **Armando Carracedo**: la ficha dice "se le aplicará un 5% de descuento
  especial al presupuesto" — interpretado como `descuentoPorcentaje: 5` en
  el partner. Si el descuento especial era solo puntual (no general),
  corregirlo desde "Editar".
- **AEDOS y BIEMME FINESTRE**: operadores intracomunitarios, IVA puesto a 0%.

## 7. Credenciales de prueba

| Tipo de usuario | Email | Contraseña |
|---|---|---|
| Admin FENSTER | `admin@fenster.test` | `Fenster2026!` |
| Comercial | `comercial@fenster.test` | `Fenster2026!` |
| Partner (cliente) | `partner@fenster.test` | `Fenster2026!` |

## 8. Cómo arrancar todo desde cero

```bash
docker compose up -d
```

```bash
cd backend && npm run start:dev
```

```bash
cd frontend && npm run dev
```

Backend en `localhost:3010`, frontend en `localhost:3004` (en modo dev
normal, sin túnel; para el túnel ver sección 2, usa `frontend-prod` en vez
de `frontend`).
