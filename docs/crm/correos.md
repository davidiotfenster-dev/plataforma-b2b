# Correos: CRM y plataforma

Los correos del CRM los envía Zoho por su cuenta. Los de la plataforma siguen saliendo por Amazon SES, con las plantillas dentro de la plataforma (`backend/src/common/email/plantillas-email.ts`). Para el CRM no hay que tocar nada de SES.

| Correo | Quién lo envía | Por dónde sale |
|---|---|---|
| Registro, cuenta aprobada o rechazada, pedido confirmado con PDF, cambios de estado, contraseña, aviso de pedido nuevo a IoT FENSTER | La plataforma B2B | Amazon SES (región Irlanda) |
| Avisos internos del CRM: vencidas, oportunidades paradas, revisión semanal | Zoho | Servidores de Zoho; no hay que configurar nada |
| Correos comerciales a clientes con las plantillas en 5 idiomas | Cada comercial desde Zoho | Su buzón conectado (Gmail, Outlook o Zoho Mail) o el envío de Zoho |
| Aviso a los admins de una pre-alta que llega desde el CRM (funcionalidad 21) | La plataforma | Amazon SES, como el aviso de nueva solicitud |
| Pedidos y empresas que aparecen en el CRM | La plataforma | No es correo: va por la API de Zoho |

## A tener en cuenta

- **El cliente no recibe correos repetidos.** Los avisos de pedido y de estado salen solo de la plataforma; el CRM no escribe al cliente por su cuenta.
- **El dominio se comparte.** Si los comerciales envían desde Zoho con direcciones @iotfenster.com, Zoho pide añadir sus registros SPF y DKIM al DNS. SES usa el subdominio `notificaciones.iotfenster.com`, así que no chocan.
- **Un solo registro SPF por nombre.** Si el dominio principal ya tiene uno, se añade el `include` de Zoho dentro de ese mismo registro. Dos registros SPF en el mismo nombre hacen que los correos acaben en spam.
