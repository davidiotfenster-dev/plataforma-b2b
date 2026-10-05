/// Contacto de IoT FENSTER al pie de la ayuda (solo para clientes y visitantes; el
/// personal no lo ve). Los títulos y textos viven en `ayuda.contactos.<id>`.
export const CONTACTOS = [
  { id: "comercial", email: "info@iotfenster.com" },
  { id: "incidencias", email: "soporte@iotfenster.com" },
] as const;

/// Número de WhatsApp para los dos contactos: prefijo del país y número, sin "+"
/// ni espacios (por ejemplo "34600000000"). Vacío, no se enseñan los botones.
export const WHATSAPP = "";
