# Tareas FENSTER — Backlog de frontend pedido por el cliente (2026-09-28)

> Backend (bloques 1-6) y scaffold inicial de frontend completados — ver
> `PROGRESO.md` y `DECISIONES.md`. Este archivo cubre el backlog de mejoras de
> frontend/UX pedido por David tras la primera demo del portal. Los bloques
> están ordenados por tamaño/riesgo, no por prioridad de negocio — reordenar
> si hace falta antes de empezar.
>
> **Antes de tocar nada**: hay una pregunta abierta al final de este archivo
> (bloque 5) que David tiene que responder antes de implementar esa parte.

## Bloque A — Ajustes rápidos (bajo riesgo, sin dependencias nuevas) ✅ completado 2026-09-28
- [x] 1. En `checkout/page.tsx`, añadir un texto de ayuda/tooltip junto al campo PO Number explicando qué es ("Número de orden de compra de tu empresa, referencia interna para tu contabilidad").
- [x] 2. En `admin/`, cambiar la redirección por defecto del admin: al hacer login como `ADMIN_FENSTER`, llevar a `/admin/pedidos` en vez de `/admin/partners` (ver `src/app/page.tsx`, la redirección actual es `router.replace(perfil.rol === "ADMIN_FENSTER" ? "/admin/partners" : "/catalogo")`).
- [x] 3. En `admin/pedidos/page.tsx`, hacer cada fila de la lista clicable → navega al detalle del pedido (reutilizar o crear `admin/pedidos/[id]/page.tsx` si no existe ya un detalle específico para admin, distinto del de partner en `pedidos/[id]/page.tsx`).
- [x] 4. Añadir una pequeña leyenda/infografía de los estados del pedido (`RECIBIDO → CONFIRMADO → EN_PREPARACION → PREPARADO → ENVIADO`) en la vista de detalle del pedido del admin — algo compacto (badges en fila con flechas o similar), no un componente grande.

## Bloque B — Cambio de estado manual "hacia atrás" (backend + frontend) ✅ completado 2026-09-28
- [x] 1. Backend: `PedidosService`/`PATCH /pedidos/:id/estado` hoy solo permite avanzar un paso (rechaza saltos y retrocesos con 409, ver `pedidos.service.ts`). Añadir una vía para que el admin pueda corregir el estado manualmente a mano (adelante o atrás) en casos excepcionales — decidir si es el mismo endpoint con un flag `forzar: true` o un endpoint nuevo `PATCH /pedidos/:id/estado/forzar`, protegido igual con `ADMIN_FENSTER`.
- [x] 2. Sea cual sea el diseño, seguir escribiendo `AuditLog` en cada cambio (incluidos los forzados, marcados como tal en el payload) — esto es clave para trazabilidad si se permite mover el estado libremente.
- [x] 3. Frontend: en el detalle del pedido del admin, además del botón de "avanzar al siguiente estado", añadir una forma de seleccionar manualmente cualquier estado (selector/dropdown), con alguna confirmación (modal o similar) para evitar cambios accidentales.
- [x] 4. Probar con curl/UI: avanzar normalmente, forzar un retroceso, forzar un salto, y verificar que todo queda en `AuditLog`.

## Bloque C — Detalle de producto en catálogo (backend + frontend) ✅ completado 2026-09-28
- [x] 1. Revisar qué falta en el modelo: `RepresentacionPartner` ya tiene `imagenUrl` y `documentacionUrl` en el schema, pero no hay UI de alta/edición de catálogo todavía (solo se puede insertar por SQL/script). Decidir si este bloque incluye una pantalla de alta de catálogo para el admin, o si de momento basta con permitir setear esos campos a mano y solo construir la pantalla de lectura/detalle del lado partner. **Decisión tomada sin confirmación explícita de David** (ver PROGRESO.md): de momento solo lectura/detalle, la pantalla de alta admin queda fuera de este bloque — confirmar o revisar si no es lo que se quería.
- [x] 2. Frontend: pantalla `catalogo/[id]/page.tsx` (o similar) que muestre imagen, nombre comercial, SKU, especificaciones técnicas (`ProductoBase.especificacionesJson`) y enlace a documentación técnica.
- [x] 3. Backend: exponer en `GET /catalogo/:id` los campos que falten (especificaciones del `ProductoBase` asociado) si el endpoint actual no los devuelve ya — revisar `productos.service.ts`.
- [x] 4. Seguir el mismo patrón de aislamiento multi-tenant ya existente (404 opaco si la representación no es del partner autenticado).

## Bloque D — Recuperación de contraseña + control de cuenta desde admin ✅ completado 2026-09-28
- [x] 1. Backend: flujo de "olvidé mi contraseña" para usuarios partner — `POST /auth/olvide-password` (recibe email, genera token de un solo uso con expiración corta, tipo el patrón ya usado para verificación de email, y envía por `EmailService` un enlace de reseteo). `POST /auth/resetear-password` (token + nueva contraseña).
- [x] 2. Frontend: pantalla de "olvidé mi contraseña" enlazada desde `/login`, y pantalla para introducir la nueva contraseña desde el enlace del email.
- [x] 3. Backend: endpoint para que el `ADMIN_FENSTER` dispare ese mismo email de reseteo a un usuario concreto sin que el usuario lo pida (`POST /partners/usuarios/:id/enviar-reset-password`).
- [x] 4. **Respondido por David**: las 4 opciones planteadas en la pregunta abierta (activar/desactivar usuario individual, forzar cierre de sesión, ver auditoría por usuario, cambiar rol). Todas implementadas — ver detalle en PROGRESO.md.

## Bloque E — Internacionalización (i18n) ✅ completado 2026-09-28
- [x] 1. Decidir librería/enfoque (`next-intl` es la opción estándar para App Router) y qué idiomas soportar inicialmente (al menos ES/EN, confirmar si hace falta algún otro por los países de los partners actuales). **Respondido por David**: ES, EN, DE, IT, PT (partners en España, Alemania, Italia y Portugal).
- [x] 2. Añadir selector de idioma en el formulario de registro (`registro/page.tsx`), guardar la preferencia (¿en el propio `User`/`Partner` en BD, o solo en cookie/localStorage del navegador?). **Decisión**: campo `idioma` en `User` (no en `Partner`, porque cada usuario de un mismo partner podría preferir un idioma distinto) + cookie `NEXT_LOCALE` como fuente de verdad de renderizado inmediato.
- [x] 3. Extraer a ficheros de traducción todos los textos ya escritos en español directamente en los componentes (`page.tsx`, `navbar.tsx`, etc.) — es un cambio transversal a todo el frontend, hacerlo en un bloque propio para no mezclar con otros cambios de UI.
- [x] 4. Decidir si los emails transaccionales (confirmación de pedido, cambios de estado, verificación de registro) también deben traducirse según el idioma del partner. **Decisión**: sí para los dos emails que realmente se envían hoy (confirmación de pedido, cambio de estado) — el email de verificación de registro no se traduce porque **no llega a enviarse de verdad todavía** (gap preexistente ya documentado en el bloque 2/9 de PROGRESO.md: solo se loguea el token en `[DEV]`, nunca se llama a `EmailService`; fuera de alcance de este bloque, ver nota más abajo).

---

## Preguntas abiertas

**Bloque D, punto 4** — ✅ respondido: las 4 herramientas propuestas (activar/desactivar usuario, forzar logout, auditoría por usuario, cambio de rol). Bloque implementado, ver arriba y PROGRESO.md.

**Bloque E** — ✅ respondido: ES, EN, DE, IT, PT. Bloque implementado, ver arriba.

**Bloque C, punto 1** — ✅ resuelto 2026-09-28: se construyó pantalla de alta/asignación de catálogo para el admin (`admin/catalogo` + `admin/partners/[id]/catalogo`), ver Bloque F más abajo (fue parte del mismo trabajo de catálogo multipartner/descuento por producto).

## Bloque F — Escalabilidad (preparar el sistema para muchos más partners/pedidos)

> Contexto: tras generar 30 partners de prueba (`npm run seed:demo`) y ver el
> admin funcionando con volumen, David pidió una checklist de mejoras de
> escalabilidad para ir completándolas todas, no solo comentarlas.

- [x] 1. **Paginación y filtrado en servidor** ✅ completado 2026-09-28 — `GET /partners` acepta `page`/`limit`/`busqueda`/`estado`; nuevo `GET /pedidos/admin/resumen-por-partner` (paginado, buscable, un partner por fila con total/pendientes) sustituye al agrupado-en-cliente de `admin/pedidos`, y `GET /pedidos/admin/por-partner/:partnerId` carga los pedidos de una tarjeta solo al desplegarla (lazy). `admin/todos` se mantiene por compatibilidad pero ya no lo usa el frontend. Frontend: componente `Paginacion` reutilizable + hook `useDebouncedValue` para no disparar una petición por tecla.
- [x] 2. **Cachear `GET /pedidos/admin/estadisticas` en Redis** ✅ completado 2026-09-28 — TTL de 120s (`ESTADISTICAS_CACHE_TTL_SEGUNDOS`), clave `pedidos:estadisticas-admin`. Sin invalidación fina a propósito (dashboard, no necesita el dato al segundo).
- [x] 3. **Asignación masiva de catálogo** ✅ completado 2026-09-28 — `POST /productos-base/:id/asignar-masivo` asigna un producto a todos los partners ACTIVO que aún no lo tengan (o a una lista concreta de `partnerIds`), con SKU/nombre/precio/descuento por defecto compartidos; usa `createMany` (una sola query) y omite en silencio a quien ya lo tuviera, devolviendo `{asignados, omitidos}`. UI en `admin/catalogo`: botón "Asignar a varios partners" por fila de producto. Probado: 25 asignados, 1 omitido (ya lo tenía).
- [x] 4. **Tests automatizados del cálculo de precio/descuento** ✅ completado 2026-09-28 — `backend/src/pedidos/pedidos.service.spec.ts` (5 tests: descuento general, override por producto, redondeo a 2 decimales, suma de varias líneas, carrito vacío) y `backend/src/carrito/carrito.service.spec.ts` (4 tests: mismos casos + caché de Redis). Prisma simulado con mocks (sin DB real, `tx.order.create` devuelve lo mismo que se le pasó para poder aserirlo). 9/9 pasan (`npm run test` → 10/10 con `app.controller.spec.ts`).

**Bloque F — completado 2026-09-28.** Los 4 puntos de escalabilidad están cerrados.

Ir marcando cada punto como `[x]` según se complete, con fecha, igual que el resto de bloques de este archivo.
