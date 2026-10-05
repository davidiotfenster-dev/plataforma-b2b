# CRM comercial con Zoho

Documentación del CRM que pide la dirección comercial de IoT FENSTER y de cómo se conecta con la Plataforma B2B.
Estado a 2026-10-05: **análisis y diseño cerrados, nada implantado todavía**. David monta el CRM en Zoho; la conexión con la plataforma está diseñada pero sin programar.

## Documentos

| Archivo | Contenido |
|---|---|
| [`funcionalidades.md`](funcionalidades.md) | Las 22 funcionalidades del CRM, cómo se monta cada una y la lista de implantación para marcar |
| [`integracion-plataforma.md`](integracion-plataforma.md) | Diseño técnico de la conexión Zoho ↔ plataforma: datos, flujos, cambios en el backend, seguridad |
| [`correos.md`](correos.md) | Qué correos envía Zoho y cuáles la plataforma (Amazon SES), y qué tocar en el DNS |
| [`maqueta/index.html`](maqueta/index.html) | Maqueta navegable del CRM con datos de ejemplo. Se abre con doble clic en el navegador |
| [`presentacion-direccion-comercial.pptx`](presentacion-direccion-comercial.pptx) | Presentación original de la dirección comercial (septiembre 2026) |

## Qué pide la dirección comercial

La presentación concluye que no compensa desarrollar un CRM propio: el equipo técnico se centra en la plataforma B2B y el CRM se hace con una herramienta existente, **Bigin by Zoho**.

- Un único CRM para Europa, organizado por país y comercial: Comercial España y agentes en Italia, Francia, Portugal y Alemania. Dirección Comercial y CEO ven el conjunto.
- Pipeline de 9 fases: Nuevo lead, Contactado, Interés, Reunión/Demo, Muestra enviada, Prueba/Validación, Oferta, Negociación, Ganado. Salidas: Perdido y Seguimiento futuro.
- 12 datos mínimos por oportunidad: empresa y país, contacto y tipo de cuenta, comercial, producto de interés, unidades al año, potencial económico, estado, último contacto, próxima acción y su fecha, origen, observaciones.
- Regla esencial: ninguna oportunidad abierta sin próxima acción y fecha.
- Panel de dirección: oportunidades por fase y país, próximas acciones (hoy, vencidas, futuras), pipeline en unidades y valor, actividad.

## Decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-05 | Producto recomendado: **Bigin Premier** (Zoho), no Zoho CRM ni Zoho One | Cubre todo lo que pide la presentación sin programar; unos 12 $/usuario/mes (≈84 $/mes para 7 usuarios). Zoho CRM solo si hacen falta territorios, Blueprint o pedidos de venta dentro del CRM. Zoho One se licencia para toda la plantilla y lo que añade no se ha pedido |
| 2026-10-05 | David configura Zoho él mismo | Funcionalidades 1 a 19 de [`funcionalidades.md`](funcionalidades.md) |
| 2026-10-05 | La plataforma manda en el cliente activo; el CRM manda en la venta | Evita dos fuentes de verdad: marca, tarifa, descuento y pedidos viven en la plataforma; comercial, fase y próxima acción en el CRM |
| 2026-10-05 | Clave común: el **CIF** de la empresa | Ya es único en `Partner.cif`; en Zoho se guarda además el UUID de la plataforma y en la plataforma el id de Zoho |
| 2026-10-05 | Un cliente ganado en el CRM llega a la plataforma como **pre-alta pendiente de aprobar**, nunca como empresa activa | Respeta la decisión del 2026-10-02: las altas las aprueba solo el administrador (ver [`TRASPASO.md`](../../TRASPASO.md)) |
| 2026-10-05 | Los avisos del CRM los envía Zoho; los de la plataforma siguen por Amazon SES | Ver [`correos.md`](correos.md) |
| 2026-10-05 | El rol `COMERCIAL` de la plataforma sigue desactivado | Los comerciales trabajan en el CRM y no necesitan entrar en el panel de admin |

## Pendiente

- Confirmar si la cuenta de prueba de David es Bigin o Zoho CRM, que está en el centro de datos europeo (`.eu`) y cuándo caduca.
- Las 8 decisiones de la presentación (herramienta, usuarios, pipeline, campos, permisos, migración, gobernanza, piloto) y si los agentes pueden ver importes de pedidos y descuentos.
- Para programar la conexión: clave de API de Zoho como secreto del entorno y permitir `accounts.zoho.eu` y `www.zohoapis.eu` en la red del entorno de nube (hoy bloqueados).
