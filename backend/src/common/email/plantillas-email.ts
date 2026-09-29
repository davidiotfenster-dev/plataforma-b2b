import { EstadoPedido, Idioma } from '../../generated/prisma/enums.js';

/// Traducciones de los emails transaccionales existentes (confirmación de
/// pedido y cambio de estado), en el idioma preferido del destinatario
/// (`User.idioma`). Deliberadamente separado de `EmailService` (que solo
/// sabe enviar, no de negocio) para mantener el servicio de envío agnóstico
/// del idioma. La verificación de registro y el resumen en PDF quedan fuera
/// de este alcance (ver PROGRESO.md, bloque E del backlog de frontend).

const ESTADOS: Record<Idioma, Record<EstadoPedido, string>> = {
  ES: {
    RECIBIDO: 'Recibido',
    CONFIRMADO: 'Confirmado',
    EN_PREPARACION: 'En preparación',
    PREPARADO: 'Preparado',
    ENVIADO: 'Enviado',
    CANCELADO: 'Cancelado',
  },
  EN: {
    RECIBIDO: 'Received',
    CONFIRMADO: 'Confirmed',
    EN_PREPARACION: 'In preparation',
    PREPARADO: 'Ready',
    ENVIADO: 'Shipped',
    CANCELADO: 'Cancelled',
  },
  DE: {
    RECIBIDO: 'Eingegangen',
    CONFIRMADO: 'Bestätigt',
    EN_PREPARACION: 'In Vorbereitung',
    PREPARADO: 'Versandbereit',
    ENVIADO: 'Versendet',
    CANCELADO: 'Storniert',
  },
  IT: {
    RECIBIDO: 'Ricevuto',
    CONFIRMADO: 'Confermato',
    EN_PREPARACION: 'In preparazione',
    PREPARADO: 'Pronto',
    ENVIADO: 'Spedito',
    CANCELADO: 'Annullato',
  },
  PT: {
    RECIBIDO: 'Recebido',
    CONFIRMADO: 'Confirmado',
    EN_PREPARACION: 'Em preparação',
    PREPARADO: 'Pronto',
    ENVIADO: 'Enviado',
    CANCELADO: 'Cancelado',
  },
};

interface DatosExpedicion {
  transportista: string | null;
  numeroExpedicion: string | null;
  trackingUrl: string | null;
}

export function nombreEstado(idioma: Idioma, estado: EstadoPedido): string {
  return ESTADOS[idioma][estado];
}

export function asuntoConfirmacionPedido(idioma: Idioma, codigoPed: string): string {
  const asuntos: Record<Idioma, string> = {
    ES: `Confirmación de pedido ${codigoPed}`,
    EN: `Order confirmation ${codigoPed}`,
    DE: `Bestellbestätigung ${codigoPed}`,
    IT: `Conferma d'ordine ${codigoPed}`,
    PT: `Confirmação de encomenda ${codigoPed}`,
  };
  return asuntos[idioma];
}

export function cuerpoConfirmacionPedido(idioma: Idioma, codigoPed: string): string {
  const cuerpos: Record<Idioma, string> = {
    ES: `<p>Su pedido <strong>${codigoPed}</strong> ha sido recibido correctamente. Adjuntamos el resumen en PDF.</p>`,
    EN: `<p>Your order <strong>${codigoPed}</strong> has been received successfully. Please find the summary attached as a PDF.</p>`,
    DE: `<p>Ihre Bestellung <strong>${codigoPed}</strong> ist erfolgreich eingegangen. Die Zusammenfassung finden Sie als PDF im Anhang.</p>`,
    IT: `<p>Il tuo ordine <strong>${codigoPed}</strong> è stato ricevuto correttamente. In allegato trovi il riepilogo in PDF.</p>`,
    PT: `<p>A sua encomenda <strong>${codigoPed}</strong> foi recebida com sucesso. Em anexo enviamos o resumo em PDF.</p>`,
  };
  return cuerpos[idioma];
}

export function asuntoCambioEstado(idioma: Idioma, codigoPed: string, estado: EstadoPedido): string {
  const nombreEstadoLocal = nombreEstado(idioma, estado);
  const asuntos: Record<Idioma, string> = {
    ES: `Pedido ${codigoPed}: nuevo estado ${nombreEstadoLocal}`,
    EN: `Order ${codigoPed}: new status ${nombreEstadoLocal}`,
    DE: `Bestellung ${codigoPed}: neuer Status ${nombreEstadoLocal}`,
    IT: `Ordine ${codigoPed}: nuovo stato ${nombreEstadoLocal}`,
    PT: `Encomenda ${codigoPed}: novo estado ${nombreEstadoLocal}`,
  };
  return asuntos[idioma];
}

export function cuerpoCambioEstado(
  idioma: Idioma,
  codigoPed: string,
  estado: EstadoPedido,
  datosExpedicion: DatosExpedicion,
  motivoCancelacion?: string | null,
): string {
  const nombreEstadoLocal = nombreEstado(idioma, estado);
  const cuerpos: Record<Idioma, string> = {
    ES: `<p>Su pedido <strong>${codigoPed}</strong> ha pasado al estado <strong>${nombreEstadoLocal}</strong>.</p>`,
    EN: `<p>Your order <strong>${codigoPed}</strong> has moved to status <strong>${nombreEstadoLocal}</strong>.</p>`,
    DE: `<p>Ihre Bestellung <strong>${codigoPed}</strong> hat nun den Status <strong>${nombreEstadoLocal}</strong>.</p>`,
    IT: `<p>Il tuo ordine <strong>${codigoPed}</strong> è passato allo stato <strong>${nombreEstadoLocal}</strong>.</p>`,
    PT: `<p>A sua encomenda <strong>${codigoPed}</strong> passou para o estado <strong>${nombreEstadoLocal}</strong>.</p>`,
  };

  if (estado === EstadoPedido.CANCELADO && motivoCancelacion) {
    const etiquetaMotivo: Record<Idioma, string> = {
      ES: 'Motivo',
      EN: 'Reason',
      DE: 'Grund',
      IT: 'Motivo',
      PT: 'Motivo',
    };
    return cuerpos[idioma] + `<p>${etiquetaMotivo[idioma]}: ${motivoCancelacion}</p>`;
  }

  if (estado !== EstadoPedido.ENVIADO) {
    return cuerpos[idioma];
  }

  const etiquetas: Record<Idioma, { transportista: string; numeroExpedicion: string; seguimiento: string }> = {
    ES: { transportista: 'Transportista', numeroExpedicion: 'Nº expedición', seguimiento: 'Seguimiento' },
    EN: { transportista: 'Carrier', numeroExpedicion: 'Tracking number', seguimiento: 'Tracking' },
    DE: { transportista: 'Spediteur', numeroExpedicion: 'Sendungsnummer', seguimiento: 'Sendungsverfolgung' },
    IT: { transportista: 'Corriere', numeroExpedicion: 'Numero di spedizione', seguimiento: 'Tracciamento' },
    PT: { transportista: 'Transportadora', numeroExpedicion: 'Nº de expedição', seguimiento: 'Rastreio' },
  };
  const etiqueta = etiquetas[idioma];

  const tracking =
    `<p>${etiqueta.transportista}: ${datosExpedicion.transportista}<br/>` +
    `${etiqueta.numeroExpedicion}: ${datosExpedicion.numeroExpedicion}<br/>` +
    `${etiqueta.seguimiento}: <a href="${datosExpedicion.trackingUrl}">${datosExpedicion.trackingUrl}</a></p>`;

  return cuerpos[idioma] + tracking;
}

export function asuntoResetPassword(idioma: Idioma): string {
  const asuntos: Record<Idioma, string> = {
    ES: 'Restablecer tu contraseña',
    EN: 'Reset your password',
    DE: 'Passwort zurücksetzen',
    IT: 'Reimposta la tua password',
    PT: 'Repor a sua palavra-passe',
  };
  return asuntos[idioma];
}

export function cuerpoResetPassword(idioma: Idioma, enlace: string): string {
  const cuerpos: Record<Idioma, string> = {
    ES: `<p>Hemos recibido una solicitud para restablecer tu contraseña. Este enlace caduca en 1 hora:</p><p><a href="${enlace}">${enlace}</a></p><p>Si no fuiste tú, puedes ignorar este correo.</p>`,
    EN: `<p>We received a request to reset your password. This link expires in 1 hour:</p><p><a href="${enlace}">${enlace}</a></p><p>If this wasn't you, you can ignore this email.</p>`,
    DE: `<p>Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Dieser Link läuft in 1 Stunde ab:</p><p><a href="${enlace}">${enlace}</a></p><p>Falls Sie das nicht waren, können Sie diese E-Mail ignorieren.</p>`,
    IT: `<p>Abbiamo ricevuto una richiesta per reimpostare la tua password. Questo link scade tra 1 ora:</p><p><a href="${enlace}">${enlace}</a></p><p>Se non sei stato tu, puoi ignorare questa email.</p>`,
    PT: `<p>Recebemos um pedido para repor a sua palavra-passe. Este link expira em 1 hora:</p><p><a href="${enlace}">${enlace}</a></p><p>Se não foi você, pode ignorar este email.</p>`,
  };
  return cuerpos[idioma];
}
