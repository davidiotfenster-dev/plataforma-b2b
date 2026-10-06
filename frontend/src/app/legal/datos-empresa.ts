/// Datos de la empresa titular del portal que aparecen en los textos legales
/// (aviso legal, privacidad, cookies y condiciones de uso). Un solo sitio para
/// rellenarlos: todo lo que siga a `null` se muestra en las páginas como
/// "pendiente" resaltado en ámbar, para que no se publique sin completar.
/// Los rellenos salen de los textos legales de www.iotfenster.com (6/10/2026).
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
  razonSocial: "IoT Fenster, S.L.",
  cif: "B30780191",
  domicilio:
    "Avda. Isaac Peral s/n, Parque Tecnológico Fuente Álamo, Ctra. del Estrecho-Lobosillo, 30320 Fuente Álamo de Murcia (Murcia), España",
  emailContacto: "info@iotfenster.com",
  /// Puede ser el mismo que `emailContacto`.
  emailPrivacidad: "info@iotfenster.com",
  telefono: "+34 968 124 979",
  /// Ej.: "Registro Mercantil de Madrid, tomo X, folio Y, hoja M-Z".
  registroMercantil: null,
  /// Proveedor y país donde se alojan la web y la base de datos.
  alojamiento: "Amazon Web Services, servidores en la Unión Europea",
  /// Ciudad cuyos juzgados resuelven los conflictos (normalmente la del domicilio social).
  ciudadTribunales: "Murcia (España)",
};

/// Fecha de la última revisión de los textos legales (se muestra en cada página).
export const ULTIMA_ACTUALIZACION_LEGAL = "6 de octubre de 2026";
