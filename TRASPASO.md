# Traspaso de contexto (2026-10-05)

Este fichero resume el trabajo de una sesión anterior para poder seguir en otra cuenta.
Léelo primero, y después `CLAUDE.md` (reglas del proyecto) y `CONTEXTO_SESION.md` (diario técnico).
La rama con los cambios es `distribuidores`. El documento de claude.ai de la sesión anterior
no es accesible desde otra cuenta: todo lo importante está aquí.

## 1. Qué es la plataforma, en breve

Portal de pedidos B2B de IoT FENSTER **sin pago en línea**: cada empresa compra con su número de
pedido (PO Number) y IoT FENSTER lo gestiona después, por orden de compra diferida.
Stack: backend NestJS + Prisma + PostgreSQL + Redis; frontend Next.js (App Router) con 5 idiomas
(es, en, de, it, pt).

**Dos caras**: portal de la empresa (`/catalogo`, `/carrito`, `/checkout`, `/pedidos`) y panel
interno (`/admin/...`).

**Roles de usuario (5)**

| Rol | Pertenece a | Qué hace |
| --- | --- | --- |
| `ADMIN_FENSTER` | IoT FENSTER | Control total: aprueba o rechaza altas por registro público, crea/edita/suspende/archiva/elimina empresas (solo sin pedidos), promociona distribuidores a partner y los degrada, gestiona catálogo base y catálogos por marca, cambia el estado de los pedidos, ve el dashboard, gestiona usuarios de cada empresa |
| `COMERCIAL` | IoT FENSTER | **DESACTIVADO por ahora** (ver 2). Antes daba de alta empresas y gestionaba solo las suyas y sus pedidos |
| `PARTNER_ADMIN` | Empresa (distribuidor o partner) | Ve catálogo, compra y consulta los pedidos de su empresa |
| `PARTNER_COMPRADOR` | Empresa | Igual que el anterior |
| `PARTNER_CONSULTA` | Empresa | Solo lectura: no modifica el carrito ni confirma pedidos |

Hoy `PARTNER_ADMIN` y `PARTNER_COMPRADOR` hacen exactamente lo mismo.

**Tipos de empresa**: todas son iguales y se llaman **distribuidores** (antes «clientes»). **Partner** =
el distribuidor que compra más y tiene submarca propia (VBH → Wave, Procomsa → ICON, MySmartWindow → Connect).
Solo el administrador convierte un distribuidor en partner. Cada empresa ve solo el catálogo de su
marca (`marcaCatalogo`: VBH, PROCOMSA o MYSMARTWINDOW); los distribuidores tienen MySmartWindow por
defecto y el admin puede asignar otro. MySmartWindow es marca propia de IoT FENSTER.

**Alta de empresas**: por registro público (verifica email con token de 24 h → pendiente de aprobación →
el admin asigna marca, tarifa y descuento) o por alta manual del admin.

**Compra**: catálogo propio → carrito persistente (precio neto calculado en servidor) → checkout con
dirección, PO Number y notas → transacción que genera `PED-000xxx`, vacía el carrito y congela precios.
Se genera el PDF del pedido (5 idiomas) y se avisa por email.

**Estados del pedido**: RECIBIDO → CONFIRMADO → EN_PREPARACION → PREPARADO → ENVIADO (con transportista,
expedición y tracking). CANCELADO exige motivo y no se puede desde ENVIADO. Solo el admin cambia estados.

**Seguridad**: JWT en cookie HTTP-only; identidad sacada en el backend; todo filtrado por empresa;
404 opaco ante recursos ajenos; UUID v4; auditoría en JSON.

## 2. Decisiones de David del 2026-10-02

1. **`CLIENTE` pasa a `DISTRIBUIDOR`** en BD, backend, frontend y los 5 idiomas.
2. **Todos los pedidos los gestiona IoT FENSTER**, también los de VBH y Procomsa. **La aprobación del partner
   sobre los pedidos de sus distribuidores se planteó y se DESCARTÓ.** No volver a proponerla sin que David lo pida.
3. Precios y descuentos los fija IoT FENSTER, como hoy.
4. Las altas de empresas las hace solo el administrador mientras tanto.
5. **El rol COMERCIAL queda desactivado** con un interruptor, sin borrar datos.

## 3. Qué está hecho (rama `distribuidores`)

- **Migración nueva** `backend/prisma/migrations/20261002150000_renombrar_tipo_empresa_cliente_a_distribuidor`:
  `ALTER TYPE "TipoEmpresa" RENAME VALUE 'CLIENTE' TO 'DISTRIBUIDOR'` (a mano; reversible con el valor inverso).
  Si Prisma la generase sola borraría y recrearía el tipo. Aplicada en la BD local: 13 distribuidores y 3 partners.
- **Backend**: `schema.prisma`, `validadores-ficha-cliente.ts` (`TIPOS_EMPRESA`), `partners.service.ts`
  (mensajes «Distribuidor»), `catalogo-marca.service.ts` (`cuenta` ahora tipada con el enum; la clave de la
  respuesta de `GET /catalogos-marca/:marca` pasa de `empresas.clientes` a `empresas.distribuidores`), DTOs,
  comentarios y scripts.
- **Interruptor del comercial**: `COMERCIAL_ACTIVO` (`config/configuration.ts`, apagado por defecto).
  `jwt.strategy.ts` rechaza sesiones de comercial y `auth.service.ts` (`validarCredenciales`) rechaza el login con
  «El acceso de comerciales está desactivado por ahora» (solo tras acertar la contraseña). Poner
  `COMERCIAL_ACTIVO=true` en `backend/.env` lo reactiva. Los `@Roles(COMERCIAL)` de los controladores no se tocaron.
- **Frontend**: tipos, `marcas.tsx`, `admin/partners/*`, `admin/marcas/page.tsx`, `ayuda/temas.ts` y los 5 JSON de
  `messages/`. Claves renombradas: `distribuidoresTitle`, `distribuidoresHelp`, `typeDistribuidor`,
  `typeDistribuidorLong`, `ayuda.q.partnerODistribuidor`; borrada `colClient` (no se usaba). Palabra por idioma:
  Distribuidor (es/pt), Distributor (en), **Händler** (de), Distributore (it).
- **Tests**: 119 en verde (eran 111): renombrado en `partners-tipo.service.spec.ts`, 3 nuevos en
  `jwt.strategy.spec.ts`, `auth-login-comercial.service.spec.ts` (nuevo) y un test del recuento por tipo en
  `catalogo-marca.service.spec.ts`. El frontend compila (`npm run build`), y `tsc` y `lint` salen limpios.
- **Verificado a mano** contra el backend local: filtro `tipo=DISTRIBUIDOR` (13) y `tipo=PARTNER` (3), `tipo=CLIENTE`
  da 400, recuento por marca, login de comercial rechazado, y el flujo de catálogo y pedidos intacto. En el navegador se
  vieron `/admin/partners` («Distribuidores 13») y `/admin/marcas` («1 partner · 13 distribuidores»).
- **Docs**: `CONTEXTO_SESION.md` (sección nueva arriba) y una nota al final de `PROCESO_CARGA_CATALOGO.md`.

**No se tocó (otro sentido de «cliente»)**: `codigoCliente` y «FICHA CLIENTE» (código del ERP), la etiqueta «CLIENTE»
del PDF del pedido, «PO Number del cliente», comentarios de «cliente HTTP/Prisma», migraciones ya aplicadas, las
filas antiguas de auditoría con `"CLIENTE"` (el registro es inmutable), las rutas `promocionar`/`degradar`.

## 4. Cómo arrancarlo en local

- Backend: puerto **3010**; frontend: **3004** (`.claude/launch.json`, configuraciones `backend` y `frontend`).
- Base de datos: Postgres en Docker (`docker compose up -d`, contenedores `fenster-postgres` y `fenster-redis`, puerto 5433).
- Aplicar migraciones: `cd backend && npx prisma migrate deploy && npx prisma generate`.
- Cuentas de prueba (contraseña en la tabla de cuentas de `CONTEXTO_SESION.md`): `admin@fenster.test` (admin),
  `partner@fenster.test` (distribuidor «Partner Ficticio S.L.»), `comercial@fenster.test` (no entra: rol apagado).
- **Ficheros de configuración que NO están en git** (`.env*` está ignorado): `backend/.env` y `frontend/.env.local`.
  En la máquina original estaban montados para una demo por túnel de Cloudflare. Para trabajar en local:
  `backend/.env` con `FRONTEND_URL="http://localhost:3004"` y sin `COOKIE_SAME_SITE="none"`, y
  `frontend/.env.development.local` con `NEXT_PUBLIC_API_URL=http://localhost:3010`.
- **No activar el envío real de emails en pruebas**: no poner `RESEND_API_KEY` salvo que David lo pida. Sin clave, el
  servicio solo escribe un aviso `[DEV]` en el log. Con ella, crear pedidos o registrar empresas manda emails reales.

## 5. Qué falta o sigue abierto

**Respuestas que esperan de su jefe** (David le pasa el texto del apéndice):
- ¿Los pedidos de VBH y Procomsa los gestiona siempre IoT FENSTER, sin que el partner intervenga en los de sus distribuidores?
- ¿Los distribuidores ven siempre el catálogo de MySmartWindow, o a veces el de VBH o el de Procomsa si el admin se lo asigna?
- ¿Quién factura a la empresa: IoT FENSTER, como hasta ahora?
- ¿El comercial debe volver más adelante, y con qué permisos? (y si al reactivarse puede volver a dar de alta empresas)
- ¿El administrador de la empresa y el comprador deben seguir pudiendo hacer lo mismo?

**Pequeñas decisiones abiertas**: palabra alemana (hoy «Händler», alternativa «Distributor»); si se cambia la etiqueta
«CLIENTE» del PDF (hoy se queda).

**Sin hacer**:
- **Publicar/desplegar**: backup de la BD → `migrate deploy` → `prisma generate` → publicar backend y frontend **a la vez**
  (cambia la clave `empresas.distribuidores`) → avisar a quien use el panel. No se ha desplegado nada.
- Las pantallas del admin en en/de/it/pt solo se revisaron en los ficheros, no en el navegador.
- `npx tsc --noEmit` en el backend da un error que ya existía: falta `supertest/types` en `test/app.e2e-spec.ts`.

## 6. Pendientes anteriores (siguen vigentes)

- **Revisar datos de partners**: el 5 % de descuento de *Armando Carracedo Chillón* (código 3923; la ficha ERP decía
  «descuento especial al presupuesto», puede ser puntual) y el IVA 0 % de *AEDOS TECH SYSTEMS* y *BIEMME FINESTRE*
  (italianas, operadores intracomunitarios; el IVA es solo informativo por ahora).
- **Emails del registro**: la verificación crea el token de 24 h pero no envía el correo ni existe la página
  `/verificar-email`. David lo hará pronto. Hay trabajo sin acabar en `auth.service.ts`, `plantillas-email.ts`,
  `email.service.ts` y `auth-altas-email.service.spec.ts`.
- **Usuarios y roles** (`CONTEXTO_SESION.md` sección 0.10): no se puede crear un 2.º usuario por empresa, no hay «cambiar mi
  contraseña» ni «Mi cuenta», nada protege al último admin de una empresa, el personal interno se crea por script y el
  admin no tiene 2FA. Propuesta: empezar por «Mi equipo» y «cambiar mi contraseña».
- **Pedidos hoy**: se gestionan por WhatsApp, llamadas, correos y un Excel, con volumen bajo. David duda si el portal
  compensa. Recomendación: no ampliarlo hasta medir el Excel y hacer un piloto con 2-3 empresas.
- Precios y GTIN de prueba en el catálogo (PVP 50 € en 23 productos, GTIN `TEST0000...`) por sustituir por los reales.

## 7. Idea descartada: aprobación del partner (por si vuelve)

Se llegó a analizar. Haría falta: un estado nuevo `PENDIENTE_APROBACION` antes de `RECIBIDO`; el vínculo se
derivaba de `marcaCatalogo` (sin campo nuevo) con un partner por marca que apruebe; endpoints propios del partner
para listar/aprobar/rechazar sus pedidos con 404 opaco; emails al partner y al distribuidor en 5 idiomas; pantallas
nuevas; y dejar a MySmartWindow fuera (marca propia). Hoy `Order` no guarda quién cambió un estado: habría que
añadir un actor al historial. Descartado por David el 2026-10-02.

## 8. Detectado de paso, fuera de este cambio

- El checkout no precarga la dirección de envío por defecto de la empresa, aunque el campo existe.
- Los botones de cambiar estado de pedido se muestran al comercial y el servidor le responde 403.
- `PARTNER_ADMIN` no puede crear ni gestionar usuarios de su empresa (solo el admin de IoT FENSTER).
- No hay aviso interno a IoT FENSTER cuando entra un pedido nuevo.
- El panel admin no muestra el historial del pedido ni permite descargar su PDF.
- Los emails insertan `motivoCancelacion`, `trackingUrl` y `transportista` sin escapar el HTML (`plantillas-email.ts`).

## 9. Apéndice: texto «Funcionamiento» que se pasa al jefe

> **En resumen.** IoT FENSTER da de alta cada empresa y le asigna un catálogo (VBH, Procomsa o MySmartWindow), una
> tarifa y un descuento. Los usuarios de la empresa entran, ven solo ese catálogo y hacen el pedido con su número de PO
> (no hay pago en línea). IoT FENSTER recibe el pedido, lo prepara y lo envía; es igual para todas las empresas, también
> para VBH y Procomsa. La empresa sigue el estado en la plataforma y recibe el enlace de seguimiento.
>
> **Tipos de usuario.** Administrador de IoT FENSTER (da de alta y gestiona empresas y usuarios, asigna catálogo, tarifa y
> descuento, convierte un distribuidor en partner, ve todos los pedidos y los avanza hasta enviado, ve estadísticas);
> Comercial (desactivado por ahora); Administrador de la empresa y Comprador (ven el catálogo, compran y consultan los
> pedidos de su empresa); Consulta (solo ve catálogo y pedidos, no compra).
>
> **Quién es quién.** Todas las empresas son iguales y se llaman distribuidores. Un partner es un distribuidor que compra
> más y tiene submarca propia. Cada empresa ve solo el catálogo de su marca; los distribuidores, por defecto, el de
> MySmartWindow, y el administrador asigna otro al darlos de alta. MySmartWindow es marca propia de IoT FENSTER.
>
> **Qué cambia y qué no.** Solo cambia que «cliente» pasa a llamarse «distribuidor» y que el comercial queda desactivado.
> No cambian el catálogo por marca, el cálculo y la congelación de precios, el PDF ni los emails.
