/// Datos de IoT FENSTER que aparecen en los textos legales. Se editan en el
/// panel (Admin › Datos legales) y se guardan en el backend; un campo vacío se
/// muestra en las páginas como "pendiente" resaltado en ámbar, para que no se
/// publique sin completar.
export const CAMPOS_LEGALES = [
  "razonSocial",
  "cif",
  "domicilio",
  "emailContacto",
  "emailPrivacidad",
  "telefono",
  "registroMercantil",
  "alojamiento",
  "ciudadTribunales",
  "portes",
  "formaPago",
  "devoluciones",
  "plazoRegistros",
] as const;

export type CampoLegal = (typeof CAMPOS_LEGALES)[number];
export type AjustesLegales = Record<CampoLegal, string | null> & { updatedAt: string | null };
