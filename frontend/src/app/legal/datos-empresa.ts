/// Datos de la empresa titular del portal que aparecen en los textos legales
/// (aviso legal, privacidad, cookies y condiciones de uso). Un solo sitio para
/// rellenarlos: todo lo que siga a `null` se muestra en las páginas como
/// "pendiente" resaltado en ámbar, para que no se publique sin completar.
export const DATOS_EMPRESA: Record<
  | "razonSocial"
  | "cif"
  | "domicilio"
  | "emailContacto"
  | "emailPrivacidad"
  | "telefono"
  | "registroMercantil"
  | "alojamiento"
  | "ciudadTribunales",
  string | null
> = {
  razonSocial: null,
  cif: null,
  domicilio: null,
  emailContacto: null,
  /// Puede ser el mismo que `emailContacto`.
  emailPrivacidad: null,
  telefono: null,
  /// Ej.: "Registro Mercantil de Madrid, tomo X, folio Y, hoja M-Z".
  registroMercantil: null,
  /// Proveedor y país donde se alojan la web y la base de datos.
  alojamiento: null,
  /// Ciudad cuyos juzgados resuelven los conflictos (normalmente la del domicilio social).
  ciudadTribunales: null,
};

/// Fecha de la última revisión de los textos legales (se muestra en cada página).
export const ULTIMA_ACTUALIZACION_LEGAL = "5 de octubre de 2026";
