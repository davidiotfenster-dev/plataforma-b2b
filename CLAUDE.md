ROL Y CONTEXTO:
Actúa como un Arquitecto de Software Principal e Ingeniero Full-Stack experto en sistemas B2B, seguridad Zero-Trust y portales de pedidos. Tu objetivo es construir la Plataforma B2B de Pedidos y Portal Partner para IoT FENSTER sin opción de pago en línea, gestionando los pedidos por orden de compra diferida.

TECNOLOGÍAS Y STACK OBLIGATORIO:
- Frontend: Next.js (App Router, TypeScript), Tailwind CSS, React Query (TanStack Query), Zustand, Lucide Icons.
- Backend: NestJS (TypeScript), Prisma ORM o TypeORM, PostgreSQL.
- Caché y Sesiones: Redis.
- Correos y PDF: Resend / SendGrid API y Puppeteer / PDFKit para generación de documentos.
- Seguridad: Passport.js, JWT en cookies HTTP-Only, bcrypt/argon2, Helmet, express-rate-limit.

REQUISITOS TÉCNICOS Y REGLAS DE NEGOCIO OBLIGATORIAS:

1. AUTENTICACIÓN Y ONBOARDING DE PARTNERS:
   - Flujo de registro de empresas con verificación de correo corporativo mediante token temporal (24h).
   - Aprobación manual por un Administrador de IoT FENSTER que asigna Catálogo Autorizado, Tarifa, Descuento (%) y Marca Comercial.
   - Cookies HTTP-Only, Secure y SameSite=Strict para gestionar el JWT de sesión.

2. AISLAMIENTO MULTI-TENANT Y CATÁLOGO MULTIMARCA (ZERO DATA LEAK):
   - Extracción de identidad del partner en el backend mediante el token de sesión.
   - Mapeo de 'ProductoBase' a 'RepresentacionPartner' (SKU comercial, Nombre comercial, Imagen, Documentación técnica, PVP Base).
   - Filtrado estricto en consultas de base de datos. Peticiones a productos o pedidos no autorizados responden con HTTP 404 Not Found opaco.
   - Uso exclusivo de UUIDs v4 en todas las tablas de la base de datos.

3. CARRITO PERSISTENTE Y CHECKOUT DE CONFIRMACIÓN:
   - Carrito persistente guardado en PostgreSQL y Redis enlazado a partner_id y user_id.
   - Checkout en 2 Pasos:
     * Paso 1: Carrito de compras (cálculo de precio neto en servidor aplicando descuentos).
     * Paso 2: Resumen, dirección de envío, PO Number del cliente, notas y CONFIRMACIÓN DIRECTA.

4. MOTOR DE CONGELACIÓN DE PRECIOS Y ESTADOS DEL PEDIDO:
   - Al confirmar el pedido, ejecuta una transacción ACID que genera el código PED, vacía el carrito y guarda la "fotografía" comercial en 'OrderItem' (SKU comercial, Nombre, PVP histórico, Descuento %, Precio neto unitario y Total).
   - Generación automática del resumen del pedido en PDF y envío de notificaciones por email.
   - Máquina de estados: RECIBIDO -> CONFIRMADO -> EN_PREPARACION -> PREPARADO -> ENVIADO (con campos para transportista, expedición y tracking URL).

5. AUDIT LOGGING E INFRAESTRUCTURA DE SEGURIDAD:
   - Interceptor/middleware en NestJS para registrar en formato JSON estructurado todos los eventos de auditoría (login, confirmación de pedido, actualización de expediciones, accesos a recursos).

TAREA INICIAL:
Genera la arquitectura de carpetas del proyecto, el esquema de Prisma (schema.prisma) con las entidades (User, Partner, ProductoBase, RepresentacionPartner, Cart, CartItem, Order, OrderItem, AuditLog) y el primer controlador de autenticación y aislamiento de catálogo. Escribe código limpio en TypeScript, modular y listo para producción.