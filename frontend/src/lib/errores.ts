import { defaultLocale, esLocaleValida, type Locale } from "@/i18n/locales";

type Textos = Record<Locale, string>;

/// Errores del servidor que se ven mucho y que antes salían siempre en español
/// («Credenciales inválidas», «Recurso no encontrado»…). Se identifican por el
/// código de negocio que manda el servidor o, si no lo hay, por el estado HTTP.
/// El resto de avisos del servidor (reglas concretas de cada formulario) siguen
/// llegando tal cual.
const MENSAJES: Record<string, Textos> = {
  CREDENCIALES_INVALIDAS: {
    es: "Correo o contraseña incorrectos.",
    en: "Incorrect email or password.",
    de: "E-Mail oder Passwort falsch.",
    it: "Email o password errate.",
    pt: "E-mail ou palavra-passe incorretos.",
  },
  PEDIDO_CAMBIADO: {
    es: "Otra persona ha cambiado este pedido mientras lo editabas. Hemos cargado su estado actual; revísalo y vuelve a intentarlo.",
    en: "Someone else changed this order while you were editing it. We have loaded its current status; check it and try again.",
    de: "Jemand anderes hat diese Bestellung geändert, während Sie sie bearbeitet haben. Der aktuelle Status wurde geladen; prüfen Sie ihn und versuchen Sie es erneut.",
    it: "Qualcun altro ha modificato questo ordine mentre lo stavi modificando. Abbiamo caricato lo stato attuale; controllalo e riprova.",
    pt: "Outra pessoa alterou esta encomenda enquanto a editava. Carregámos o estado atual; reveja-o e tente novamente.",
  },
  TRANSICION_INVALIDA: {
    es: "Ese cambio de estado ya no es posible: el pedido ha cambiado. Hemos cargado su estado actual.",
    en: "That status change is no longer possible: the order has changed. We have loaded its current status.",
    de: "Dieser Statuswechsel ist nicht mehr möglich: Die Bestellung hat sich geändert. Der aktuelle Status wurde geladen.",
    it: "Questo cambio di stato non è più possibile: l'ordine è cambiato. Abbiamo caricato lo stato attuale.",
    pt: "Essa mudança de estado já não é possível: a encomenda mudou. Carregámos o estado atual.",
  },
  PEDIDO_YA_EN_ESTADO: {
    es: "El pedido ya estaba en ese estado: alguien se te ha adelantado. Hemos cargado su estado actual.",
    en: "The order was already in that status: someone got there first. We have loaded its current status.",
    de: "Die Bestellung hatte diesen Status bereits: Jemand war schneller. Der aktuelle Status wurde geladen.",
    it: "L'ordine era già in quello stato: qualcuno è stato più veloce. Abbiamo caricato lo stato attuale.",
    pt: "A encomenda já estava nesse estado: alguém se adiantou. Carregámos o estado atual.",
  },
  HTTP_403: {
    es: "No tienes permiso para hacer esto.",
    en: "You do not have permission to do this.",
    de: "Dazu haben Sie keine Berechtigung.",
    it: "Non hai il permesso di farlo.",
    pt: "Não tem permissão para fazer isto.",
  },
  HTTP_404: {
    es: "No se ha encontrado lo que buscas.",
    en: "We could not find what you are looking for.",
    de: "Das Gesuchte wurde nicht gefunden.",
    it: "Non abbiamo trovato ciò che cerchi.",
    pt: "Não encontrámos o que procura.",
  },
  HTTP_429: {
    es: "Demasiados intentos seguidos. Espera un momento y vuelve a probar.",
    en: "Too many attempts in a row. Wait a moment and try again.",
    de: "Zu viele Versuche hintereinander. Warten Sie einen Moment und versuchen Sie es erneut.",
    it: "Troppi tentativi consecutivi. Attendi un momento e riprova.",
    pt: "Demasiadas tentativas seguidas. Aguarde um momento e tente novamente.",
  },
  HTTP_5XX: {
    es: "Ha habido un problema en el servidor. Inténtalo de nuevo en unos minutos.",
    en: "There was a problem on the server. Try again in a few minutes.",
    de: "Auf dem Server ist ein Problem aufgetreten. Versuchen Sie es in einigen Minuten erneut.",
    it: "Si è verificato un problema sul server. Riprova tra qualche minuto.",
    pt: "Ocorreu um problema no servidor. Tente novamente dentro de alguns minutos.",
  },
};

/// Códigos que significan «otra persona cambió el pedido»: la pantalla debe recargarse.
export const CODIGOS_PEDIDO_CAMBIADO = ["PEDIDO_CAMBIADO", "TRANSICION_INVALIDA", "PEDIDO_YA_EN_ESTADO"];

function idiomaActual(): Locale {
  const lang = typeof document === "undefined" ? undefined : document.documentElement.lang;
  return esLocaleValida(lang) ? lang : defaultLocale;
}

/// El texto del error en el idioma de la pantalla, o el del servidor si no hay uno propio.
export function mensajeDeError(status: number, codigo: string | undefined, mensajeServidor: string): string {
  const clave = codigo && MENSAJES[codigo] ? codigo : status >= 500 ? "HTTP_5XX" : codigo ? null : `HTTP_${status}`;
  const textos = clave ? MENSAJES[clave] : undefined;
  return textos ? textos[idiomaActual()] : mensajeServidor;
}
