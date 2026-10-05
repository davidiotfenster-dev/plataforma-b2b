import { EstadoPedido, Idioma } from '../../generated/prisma/enums.js';

/// Traducciones de los emails transaccionales (confirmación de pedido, cambio
/// de estado, restablecer contraseña y alta de empresas: verificación,
/// aprobada, rechazada), en el idioma preferido del destinatario
/// (`User.idioma`). Deliberadamente separado de `EmailService` (que solo
/// sabe enviar, no de negocio) para mantener el servicio de envío agnóstico
/// del idioma. El aviso interno de nueva solicitud va siempre en español: lo
/// reciben los administradores de IoT FENSTER.

/// Los datos que escribe el usuario (razón social, país) acaban dentro del HTML
/// de un correo: se escapan para que no puedan inyectar etiquetas.
export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

export function asuntoVerificacionEmail(idioma: Idioma): string {
  const asuntos: Record<Idioma, string> = {
    ES: 'Confirma tu correo en IoT FENSTER',
    EN: 'Confirm your email at IoT FENSTER',
    DE: 'Bestätigen Sie Ihre E-Mail-Adresse bei IoT FENSTER',
    IT: 'Conferma la tua email su IoT FENSTER',
    PT: 'Confirme o seu email na IoT FENSTER',
  };
  return asuntos[idioma];
}

export function cuerpoVerificacionEmail(idioma: Idioma, enlace: string): string {
  const cuerpos: Record<Idioma, string> = {
    ES: `<p>Gracias por registrar tu empresa. Confirma tu correo corporativo con este enlace (caduca en 24 horas):</p><p><a href="${enlace}">${enlace}</a></p><p>Después, un administrador de IoT FENSTER revisará y aprobará el alta. Si no has sido tú, puedes ignorar este correo.</p>`,
    EN: `<p>Thank you for registering your company. Please confirm your corporate email with this link (it expires in 24 hours):</p><p><a href="${enlace}">${enlace}</a></p><p>An IoT FENSTER administrator will then review and approve your registration. If this wasn't you, you can ignore this email.</p>`,
    DE: `<p>Vielen Dank für die Registrierung Ihres Unternehmens. Bitte bestätigen Sie Ihre Firmen-E-Mail über diesen Link (gültig für 24 Stunden):</p><p><a href="${enlace}">${enlace}</a></p><p>Anschließend prüft und genehmigt ein Administrator von IoT FENSTER Ihre Registrierung. Falls Sie das nicht waren, können Sie diese E-Mail ignorieren.</p>`,
    IT: `<p>Grazie per aver registrato la tua azienda. Conferma la tua email aziendale con questo link (scade tra 24 ore):</p><p><a href="${enlace}">${enlace}</a></p><p>Poi un amministratore di IoT FENSTER esaminerà e approverà la registrazione. Se non sei stato tu, puoi ignorare questa email.</p>`,
    PT: `<p>Obrigado por registar a sua empresa. Confirme o seu email corporativo com este link (expira em 24 horas):</p><p><a href="${enlace}">${enlace}</a></p><p>Depois, um administrador da IoT FENSTER irá analisar e aprovar o registo. Se não foi você, pode ignorar este email.</p>`,
  };
  return cuerpos[idioma];
}

export function asuntoCuentaAprobada(idioma: Idioma): string {
  const asuntos: Record<Idioma, string> = {
    ES: 'Tu cuenta de IoT FENSTER está activa',
    EN: 'Your IoT FENSTER account is active',
    DE: 'Ihr IoT FENSTER-Konto ist aktiv',
    IT: 'Il tuo account IoT FENSTER è attivo',
    PT: 'A sua conta IoT FENSTER está ativa',
  };
  return asuntos[idioma];
}

export function cuerpoCuentaAprobada(idioma: Idioma, enlaceLogin: string): string {
  const cuerpos: Record<Idioma, string> = {
    ES: `<p>Tu empresa ha sido aprobada. Ya puedes iniciar sesión y hacer pedidos:</p><p><a href="${enlaceLogin}">${enlaceLogin}</a></p>`,
    EN: `<p>Your company has been approved. You can now sign in and place orders:</p><p><a href="${enlaceLogin}">${enlaceLogin}</a></p>`,
    DE: `<p>Ihr Unternehmen wurde genehmigt. Sie können sich jetzt anmelden und Bestellungen aufgeben:</p><p><a href="${enlaceLogin}">${enlaceLogin}</a></p>`,
    IT: `<p>La tua azienda è stata approvata. Ora puoi accedere e fare ordini:</p><p><a href="${enlaceLogin}">${enlaceLogin}</a></p>`,
    PT: `<p>A sua empresa foi aprovada. Já pode iniciar sessão e fazer encomendas:</p><p><a href="${enlaceLogin}">${enlaceLogin}</a></p>`,
  };
  return cuerpos[idioma];
}

export function asuntoCuentaRechazada(idioma: Idioma): string {
  const asuntos: Record<Idioma, string> = {
    ES: 'Sobre tu solicitud de alta en IoT FENSTER',
    EN: 'About your IoT FENSTER registration request',
    DE: 'Zu Ihrer Registrierungsanfrage bei IoT FENSTER',
    IT: 'Sulla tua richiesta di registrazione su IoT FENSTER',
    PT: 'Sobre o seu pedido de registo na IoT FENSTER',
  };
  return asuntos[idioma];
}

export function cuerpoCuentaRechazada(idioma: Idioma): string {
  const cuerpos: Record<Idioma, string> = {
    ES: '<p>No hemos podido aprobar el alta de tu empresa en este momento. Si crees que se trata de un error, ponte en contacto con IoT FENSTER.</p>',
    EN: '<p>We were unable to approve your company registration at this time. If you believe this is a mistake, please contact IoT FENSTER.</p>',
    DE: '<p>Wir konnten die Registrierung Ihres Unternehmens derzeit nicht genehmigen. Wenn Sie glauben, dass es sich um einen Irrtum handelt, wenden Sie sich bitte an IoT FENSTER.</p>',
    IT: '<p>Al momento non siamo riusciti ad approvare la registrazione della tua azienda. Se pensi che si tratti di un errore, contatta IoT FENSTER.</p>',
    PT: '<p>De momento não foi possível aprovar o registo da sua empresa. Se considera que se trata de um engano, contacte a IoT FENSTER.</p>',
  };
  return cuerpos[idioma];
}

/// Aviso interno (siempre en español) a los administradores cuando una empresa
/// ha verificado su correo y queda pendiente de aprobación.
export function asuntoNuevaSolicitud(razonSocial: string): string {
  return `Nueva solicitud de alta: ${razonSocial.replace(/[\r\n]+/g, ' ')}`;
}

export function cuerpoNuevaSolicitud(razonSocial: string, pais: string, enlace: string): string {
  return (
    `<p>La empresa <strong>${escaparHtml(razonSocial)}</strong> (${escaparHtml(pais)}) ha verificado su correo y espera aprobación.</p>` +
    `<p><a href="${enlace}">Revisar la solicitud</a></p>`
  );
}
