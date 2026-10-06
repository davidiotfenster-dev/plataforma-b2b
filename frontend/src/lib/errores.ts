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
  FICHA_CAMBIADA: {
    es: "Otra persona ha modificado esta ficha mientras la editabas. Recarga la página para ver sus cambios y vuelve a hacer los tuyos.",
    en: "Someone else changed this record while you were editing it. Reload the page to see their changes and redo yours.",
    de: "Jemand anderes hat diesen Datensatz geändert, während Sie ihn bearbeitet haben. Laden Sie die Seite neu, um die Änderungen zu sehen, und wiederholen Sie Ihre.",
    it: "Qualcun altro ha modificato questa scheda mentre la modificavi. Ricarica la pagina per vedere le sue modifiche e rifai le tue.",
    pt: "Outra pessoa alterou esta ficha enquanto a editava. Recarregue a página para ver as alterações e refaça as suas.",
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

const MENSAJE_POR_DEFECTO = /^(forbidden( resource)?|not found|unauthorized|internal server error|bad gateway|service unavailable|gateway timeout|too many requests|throttlerexception.*|error de red|)$/i;

/// El texto del error en el idioma de la pantalla, o el del servidor si no hay uno propio.
export function mensajeDeError(status: number, codigo: string | undefined, mensajeServidor: string): string {
  // Con el mensaje por defecto de Nest («Forbidden resource»…) no hay nada que explicar y se usa el
  // texto genérico; si el servidor da una razón concreta («Tu usuario es de solo consulta…»), se conserva.
  const generico = status === 404 || MENSAJE_POR_DEFECTO.test(mensajeServidor);
  const clave = codigo && MENSAJES[codigo] ? codigo : codigo || !generico ? null : status >= 500 ? "HTTP_5XX" : `HTTP_${status}`;
  const textos = clave ? MENSAJES[clave] : undefined;
  return textos ? textos[idiomaActual()] : mensajeServidor;
}

/// Reglas de validación del servidor (class-validator), que llegan en inglés técnico:
/// «trackingUrl must be a URL address», «nombre should not be empty»…
const REGLAS: { patron: RegExp; textos: (m: RegExpMatchArray) => Textos }[] = [
  {
    patron: /^(\w+) should not be empty$/,
    textos: () => ({
      es: "es obligatorio", en: "is required", de: "ist erforderlich", it: "è obbligatorio", pt: "é obrigatório",
    }),
  },
  {
    patron: /^(\w+) must be a URL address$/,
    textos: () => ({
      es: "debe ser una dirección web válida (con https://)", en: "must be a valid web address (with https://)",
      de: "muss eine gültige Webadresse sein (mit https://)", it: "deve essere un indirizzo web valido (con https://)",
      pt: "deve ser um endereço web válido (com https://)",
    }),
  },
  {
    patron: /^(\w+) must be an email$/,
    textos: () => ({
      es: "debe ser un correo electrónico válido", en: "must be a valid email address",
      de: "muss eine gültige E-Mail-Adresse sein", it: "deve essere un indirizzo email valido", pt: "deve ser um e-mail válido",
    }),
  },
  {
    patron: /^(\w+) must be longer than or equal to (\d+) characters$/,
    textos: (m) => ({
      es: `debe tener al menos ${m[2]} caracteres`, en: `must have at least ${m[2]} characters`,
      de: `muss mindestens ${m[2]} Zeichen haben`, it: `deve avere almeno ${m[2]} caratteri`, pt: `deve ter pelo menos ${m[2]} caracteres`,
    }),
  },
  {
    patron: /^(\w+) must be shorter than or equal to (\d+) characters$/,
    textos: (m) => ({
      es: `no puede pasar de ${m[2]} caracteres`, en: `cannot exceed ${m[2]} characters`,
      de: `darf ${m[2]} Zeichen nicht überschreiten`, it: `non può superare ${m[2]} caratteri`, pt: `não pode ultrapassar ${m[2]} caracteres`,
    }),
  },
  {
    patron: /^(\w+) must not be (greater|less) than (\S+)$/,
    textos: (m) => ({
      es: `no puede ser ${m[2] === "greater" ? "mayor" : "menor"} que ${m[3]}`,
      en: `cannot be ${m[2] === "greater" ? "greater" : "less"} than ${m[3]}`,
      de: `darf nicht ${m[2] === "greater" ? "größer" : "kleiner"} als ${m[3]} sein`,
      it: `non può essere ${m[2] === "greater" ? "maggiore" : "minore"} di ${m[3]}`,
      pt: `não pode ser ${m[2] === "greater" ? "maior" : "menor"} que ${m[3]}`,
    }),
  },
  {
    patron: /^(\w+) must be an? (positive )?(number|integer number|string)\b.*$/,
    textos: () => ({
      es: "no tiene un valor válido", en: "does not have a valid value", de: "hat keinen gültigen Wert",
      it: "non ha un valore valido", pt: "não tem um valor válido",
    }),
  },
  {
    patron: /^(\w+) must be one of the following values: .*$/,
    textos: () => ({
      es: "no es una opción válida", en: "is not a valid option", de: "ist keine gültige Option",
      it: "non è un'opzione valida", pt: "não é uma opção válida",
    }),
  },
];

/// «trackingUrl» → «Tracking url»: lo más legible sin un diccionario de campos.
function nombreDeCampo(clave: string): string {
  const palabras = clave.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return palabras.charAt(0).toUpperCase() + palabras.slice(1);
}

/// Traduce un aviso de validación del servidor si es de los genéricos; si no, lo deja igual
/// (los que escribimos nosotros, como «CIF/NIF no válido», ya llegan en español).
export function mensajeDeValidacion(mensaje: string): string {
  if (/file too large/i.test(mensaje)) {
    return {
      es: "El archivo es demasiado grande.", en: "The file is too large.", de: "Die Datei ist zu groß.",
      it: "Il file è troppo grande.", pt: "O ficheiro é demasiado grande.",
    }[idiomaActual()];
  }
  for (const { patron, textos } of REGLAS) {
    const m = mensaje.match(patron);
    if (m) return `${nombreDeCampo(m[1])} ${textos(m)[idiomaActual()]}`;
  }
  return mensaje;
}
