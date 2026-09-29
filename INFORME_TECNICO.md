# INFORME TÉCNICO DE ESPECIFICACIÓN Y ARQUITECTURA DEL SISTEMA

**Proyecto:** Plataforma B2B de Pedidos y Portal Partner IoT FENSTER  
**Sistema Complementario:** CRM Comercial Europeo (Bigin by Zoho)  
**Fecha:** 24 de Septiembre de 2026[cite: 1, 2]  
**Documentación de referencia:** *Especificación funcional y técnica Plataforma B2B v1.0* e *Informe CRM Comercial IoT FENSTER*.

---

## 1. RESUMEN EJECUTIVO Y ARQUITECTURA GENERAL

### 1.1 Contexto y Objetivos del Proyecto
El proyecto tiene como objetivo central la automatización del proceso de pedidos B2B, convirtiendo el portal web en el punto neurálgico de la relación con distribuidores y *partners* europeos de IoT FENSTER[cite: 1]. El tiempo objetivo para completar un pedido sencillo se fija en menos de 2 minutos[cite: 1], erradicando el uso de correos electrónicos, llamadas y hojas de cálculo para evitar errores de referencias, precios, descuentos y fechas de salida[cite: 1].

Paralelamente, para la gestión del ciclo de ventas paneuropeo se adopta una solución SaaS externa (**Bigin by Zoho**), evitando el desarrollo de un CRM propio para concentrar todos los recursos de ingeniería en el desarrollo a medida de la plataforma B2B.

### 1.2 Decisiones de Arquitectura y Stack Tecnológico
Se descarta formalmente el uso de **Shopify Plus** (debido a su elevado coste recurrente de más de 22.000 $/año, la rigidez para manejar productos base multimarca y la imposibilidad de garantizar un aislamiento estricto del catálogo en su API)[cite: 1] y de **Strapi CMS** (al ser un gestor de contenidos no transaccional que requeriría la sobrescritura masiva de controladores y carecer de soporte nativo para motores de cálculo de precios B2B y congelación de importes)[cite: 1].

El pago en línea se elimina del alcance del proyecto[cite: 1]. Toda la facturación y cobro se gestionan de forma diferida o por crédito comercial mediante orden de compra directa[cite: 1].
[ FRONTEND PORTAL B2B ]          [ BACKEND API REST / NestJS ]         [ INFRAESTRUCTURA Y SERVICIOS ]
+-----------------------+        +---------------------------+         +-----------------------------+
| - Next.js (TypeScript)| <----> | - Motor Multi-Tenant      | <-----> | - PostgreSQL (DB Relacional)|
| - Tailwind CSS        | HTTP/  | - Guardias de RBAC/ABAC   |  ORM /  | - Amazon S3 (Fichas/PDFs)   |
| - React Query / Zustand| Cookie | - Engine de Precios & Cart|  SQL    | - Redis (Sesiones/Caché)    |
+-----------------------+        | - Webhooks & Eventos      |         | - Servicio Email / Resend   |
+---------------------------+         +-----------------------------+


* **Frontend:** *Next.js* (React / TypeScript), optimizado para rendimiento *responsive*, renderizado híbrido (SSR/SSG) y arquitectura por componentes aislados[cite: 1].
* **Backend:** *NestJS* (Node.js / TypeScript), siguiendo principios de arquitectura limpia (*Clean Architecture*), inyección de dependencias y aislamiento de controladores.
* **Base de Datos:** *PostgreSQL*, utilizando un modelo relacional estricto con transacciones ACID y políticas de seguridad a nivel de fila (*Row-Level Security*)[cite: 1].
* **Persistencia en Caché y Estado:** *Redis* para gestión de bloqueos distribuidos, límites de peticiones (*rate-limiting*) y sesiones activas.

---

## 2. SISTEMA DE AUTENTICACIÓN, ROLES Y REGISTRO

### 2.1 Flujo de Registro y Verificación Corporativa
Para evitar accesos no autorizados o filtraciones de catálogo, el registro de nuevos distribuidores implementa un proceso de validación en dos pasos:

[ Solicitud de Registro ] ---> [ Verificación Email Token ] ---> [ Revisión Manual Admin ] ---> [ Alta y Asignación Catálogo ]
(Formulario Empresa)            (Enlace temporal 24h)            (Panel IoT FENSTER)            (Tarifa, Descuentos y Marca)


1. **Formulario de Registro:** La empresa solicitante introduce Razón Social, CIF/NIF, dirección fiscal, país, dominio web corporativo y correo del usuario administrador.
2. **Verificación de Correo Electrónico:** Se envía un token firmado digitalmente (JWT) de un solo uso con caducidad de 24 horas. El usuario debe confirmar la propiedad de la cuenta de correo corporativa.
3. **Validación y Revisión Comercial:** El pedido de registro entra en estado `PENDIENTE_APROBACION`. El administrador de IoT FENSTER revisa la solicitud desde el panel de control[cite: 1].
4. **Activación y Asignación:** Al aprobar la cuenta, el administrador asigna el catálogo autorizado, la tarifa correspondiente, la matriz de descuentos y la marca comercial con la que operará[cite: 1].

### 2.2 Sistema de Roles y Permisos (RBAC + ABAC)

* **Administrador IoT FENSTER:** Configuración global de *partners*, asignación de productos base, marcas, tarifas y descuentos[cite: 1]. Control del flujo de pedidos, actualización de estados de expedición, consulta de logs de auditoría y exportación de informes[cite: 1].
* **Partner / Distribuidor:** Acceso exclusivo a su catálogo autorizado, precios netos calculados y documentos técnicos asignados[cite: 1]. Creación de pedidos por orden de compra, seguimiento de envíos y administración de múltiples usuarios internos bajo la misma empresa (*Empresa-Admin*, *Empresa-Comprador*, *Empresa-Consulta*)[cite: 1].

---

## 3. MODELO MULTIPARTNER, MULTIMARCA Y AISLAMIENTO DE DATOS

### 3.1 Abstracción de Producto Base a Representación Comercial
Para permitir que un mismo producto de fábrica (*Producto Base*) sea comercializado por distintos distribuidores con diferente nombre, imagen, referencia (SKU) y documentación, la base de datos implementa una estructura relacional desacoplada[cite: 1]:

+------------------------+        +----------------------------------+        +-----------------------+
|  PRODUCTO_BASE         |        | REPRESENTACION_PARTNER           |        | CATALOGO_AUTORIZADO   |
+------------------------+        +----------------------------------+        +-----------------------+
| id (UUID)              | 1    N | id (UUID)                        | N    1 | id (UUID)             |
| sku_industrial         |-------<| producto_base_id (FK)            |>-------| partner_id (FK)       |
| nombre_tecnico         |        | partner_id (FK)                  |        | fecha_inicio          |
| especificaciones_json  |        | sku_comercial_partner            |        | activo (boolean)      |
+------------------------+        | nombre_comercial (ej. Connect..) |        +-----------------------+
| imagen_url / doc_url             |
| pvp_base                         |
+----------------------------------+


### 3.2 Garantía de Aislamiento en API y Base de Datos (Zero Data Leak)

* **Validación de Identidad en Servidor:** Cada petición HTTP entrante extrae la identidad cifrada en la cookie de sesión (`partner_id`)[cite: 1].
* **Filtrado en Nivel de Base de Datos (RLS):** Las consultas de productos aplican la condición obligatoria `WHERE partner_id = :current_partner_id AND activo = true`.
* **Regla de Respuesta Nula / Opaca:** Si la API recibe una consulta intentando acceder a una referencia o ID que no pertenece al catálogo del *partner*, la API devuelve un código HTTP `404 Not Found` idéntico al de un recurso inexistente, evitando ataques de reconocimiento o enumeración de catálogo[cite: 1].
* **Uso Exclusivo de UUIDs:** Se prohíbe el uso de IDs secuenciales (`1, 2, 3...`) en favor de identificadores `UUID v4` no adivinables.

---

## 4. MOTOR DE CARRITO PERSISTENTE Y CHECKOUT DE CONFIRMACIÓN

### 4.1 Persistencia del Carrito en Servidor
A diferencia de los carritos B2C basados en almacenamiento local de navegador (*LocalStorage*), el estado del carrito en esta plataforma se sincroniza en tiempo real con la base de datos relacional y Redis:

* **Sincronización Multidispositivo:** Si un usuario añade productos desde un dispositivo móvil y posteriormente accede desde su ordenador de oficina, el estado del carrito se mantiene exactamente en el mismo punto.
* **Control de Variaciones de Stock y Estado:** Si un producto cambia de disponibilidad o de tarifa mientras está dentro del carrito, el backend notifica de forma transparente al usuario al cargar la página del carrito.

### 4.2 Flujo de Checkout en 2 Pasos

[ PASO 1: CARRITO DE COMPRAS ] --------------------> [ PASO 2: RESUMEN Y CONFIRMACIÓN ]

Revisión de ítems y cantidades                     - Selección dirección de entrega y contacto

Aplicación de escalado/packs                       - Número de orden de compra cliente (PO Number)

Cálculo PVP y Neto parcial en servidor            - Confirmación directa, generación PED y PDF


* **Paso 1: Carrito de Compras:** Visualización de las líneas seleccionadas, aplicación del escalado por volumen o packs si existen[cite: 1], e importe neto recalculado dinámicamente en servidor[cite: 1].
* **Paso 2: Resumen Operativo y Confirmación Directa:** Selección de dirección de entrega, número de PO del cliente, observaciones para el almacén y botón de **Confirmar Pedido**[cite: 1]. Al pulsar, el pedido se procesa inmediatamente sin pasarelas de pago ni tarjetas de crédito[cite: 1].

---

## 5. CONGELACIÓN DE PRECIOS Y OPERATIVA DEL PEDIDO

### 5.1 Algoritmo de Congelación de Precio (Price Snapshot)
Al confirmarse el pedido, el motor ejecuta la "fotografía comercial" inalterable en una única transacción ACID[cite: 1]. Cada línea guardada en la tabla `order_items` almacena de forma independiente los siguientes valores históricos[cite: 1]:

$$\text{Precio Neto Línea} = \text{PVP Base Aplicado} \times \left(1 - \frac{\text{Descuento Partner \%}}{100}\right) \times \text{Cantidad}$$

Los datos registrados en la congelación son: `sku_comercial`, `nombre_producto_partner`, `pvp_historico`, `descuento_aplicado`, `precio_neto_unitario` y `total_linea`[cite: 1]. Modificaciones posteriores en las tarifas generales de la empresa no afectarán bajo ninguna circunstancia a los pedidos ya confirmados[cite: 1].

### 5.2 Ciclo de Vida del Pedido y Notificaciones

[ RECIBIDO ] ──► [ CONFIRMADO ] ──► [ EN PREPARACIÓN ] ──► [ PREPARADO ] ──► [ ENVIADO ]
(Nuevo PED)     (Rev. Comercial)    (Almacén/Fab.)       (Pend. Salida)   (Tracking OK)


1. **RECIBIDO:** Pedido creado correctamente por el *partner* tras la confirmación en el portal[cite: 1].
2. **CONFIRMADO:** Validación comercial interna por parte de IoT FENSTER[cite: 1].
3. **EN PREPARACIÓN:** Orden enviada a fábrica o almacén[cite: 1].
4. **PREPARADO:** Paquete embalado pendiente de recogida por la agencia[cite: 1].
5. **ENVIADO:** Asignación de empresa transportista, número de expedición y URL de *tracking* en tiempo real[cite: 1]. Notificación automática por email y actualización en el portal del *partner*[cite: 1].

---

## 6. PORTAL PRIVADO DEL PARTNER Y ZONA DE DOCUMENTACIÓN

Cada distribuidor dispone de un área privada dividida en cuatro secciones funcionales:

1. **Panel de Gestión de Pedidos:** Histórico completo de operaciones con buscador por número de pedido (PED), rango de fechas y filtro por estado[cite: 1]. Descarga inmediata de resúmenes de pedido en PDF y facturas[cite: 1].
2. **Seguimiento de Envíos (*Tracking*):** Acceso directo a la información del transportista, fecha estimada de salida/entrega y localización del paquete[cite: 1].
3. **Centro de Documentación Técnica:** Biblioteca descargable con manuales de instalación, fichas técnicas, certificados de calidad y material de formación autorizados específicamente para su catálogo de productos[cite: 1].
4. **Administración de Cuenta:** Configuración de direcciones de envío habituales, datos de contacto de facturación y gestión de usuarios autorizados de la empresa[cite: 1].

---

## 7. REGISTRO DE AUDITORÍA, LOGGING Y SEGURIDAD PERIMETRAL

### 7.1 Sistema de Logging Estructurado (JSON)
El backend implementa un módulo de registro inmutable (*Append-Only*) que graba eventos críticos en un repositorio separado con el siguiente esquema JSON:

```json
{
  "timestamp": "2026-09-24T15:42:00.123Z",
  "level": "INFO",
  "eventType": "ORDER_CONFIRMED_PRICE_FROZEN",
  "userId": "usr_98a7f23c-411a-4f52-8c11-9a74b3d81012",
  "partnerId": "prt_11029384-99a8-4221-a123-bc9823120011",
  "ipAddress": "198.51.100.45",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "request": {
    "endpoint": "/api/v1/orders/create",
    "method": "POST"
  },
  "payloadSummary": {
    "orderId": "ped_772183",
    "totalNeto": 1420.50,
    "itemCount": 4
  },
  "status": 201
}
7.2 Protecciones Perimetrales y de Aplicación
Cifrado Total: TLS 1.3 en tránsito (HTTPS) y cifrado AES-256 en reposo para la base de datos y adjuntos en S3[cite: 1].

Web Application Firewall (WAF): Reglas para mitigación de ataques DDoS, inyecciones SQL, Cross-Site Scripting (XSS) y raspado automático de catálogo.

Política de Headers de Seguridad: Inyección estricta de Content-Security-Policy (CSP), X-Frame-Options: DENY, Strict-Transport-Security (HSTS) y cookies con directivas HttpOnly; Secure; SameSite=Strict[cite: 1].

8. ESTRATEGIA DE CRM COMERCIAL (BIGIN BY ZOHO)
Para la gestión de ventas del equipo comercial paneuropeo (España, Italia, Francia, Portugal y Alemania)[cite: 2], se implementa Bigin by Zoho[cite: 2].

+---------------------------------------------------------------------------------------------------------+
|                                    EMBUDO COMERCIAL EUROPEO (PIPELINE)                                  |
+-----------+------------+----------+---------------+----------------+-------------------+--------+---+
| 1. NUEVO  | 2. CONTACTO| 3.INTERÉS| 4. DEMO/REUN. | 5. MUESTRA ENV.| 6. VALIDACIÓN PRU.| 7.OFERTA|...|
|    LEAD   |            |          |               |                |                   |        |   |
+-----------+------------+----------+---------------+----------------+-------------------+--------+---+
8.1 Regla Operativa Fundamental
Ninguna oportunidad abierta en el CRM puede carecer de una Próxima Acción y una Fecha de Cumplimiento asignada[cite: 2]. Esto asegura la disciplina en el seguimiento comercial y evita la pérdida de oportunidades tras reuniones, envíos de muestras u ofertas[cite: 2].

9. ALCANCE DEL MVP Y HOJA DE RUTA
+---------------------------------------------------------------------------------------------------+
| FASE 1: MVP NÚCLEO (Puesta en Marcha)                                                             |
| - Autenticación, registro verificado y roles (Admin / Partner)                                    |
| - Catálogo personalizado multimarca con precios netos calculados en servidor                       |
| - Carrito persistente, checkout de 2 pasos y congelación de precios en pedido (PDF)                |
| - Panel de administración de pedidos, estados de expedición y logs de auditoría                   |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+---------------------------------------------------------------------------------------------------+
| FASE 2: EFICIENCIA DEL PARTNER                                                                    |
| - Tracking avanzado con transportistas, direcciones múltiples de entrega                          |
| - Pedido rápido por CSV/SKU, función de repetir pedido, compra por packs                          |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+---------------------------------------------------------------------------------------------------+
| FASE 3: CONEXIÓN DEL ECOSISTEMA                                                                   |
| - Integración vía API / Webhooks con ERP de producción, CRM (Bigin) y agencias de transporte      |
+-------------------------------------------------------------------------------------------