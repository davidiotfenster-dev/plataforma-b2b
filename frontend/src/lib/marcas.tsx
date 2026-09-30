import type { MarcaCatalogo, TipoEmpresa } from "./types";

export const MARCAS_CATALOGO: MarcaCatalogo[] = ["MYSMARTWINDOW", "VBH", "PROCOMSA"];
export const TIPOS_EMPRESA: TipoEmpresa[] = ["PARTNER", "CLIENTE"];

/// Nombre y colores de cada submarca en el panel (solo decorativo).
export const MARCA_INFO: Record<MarcaCatalogo, { etiqueta: string; submarca: string; insignia: string; acento: string; borde: string }> = {
  VBH: { etiqueta: "VBH", submarca: "Wave", insignia: "bg-sky-50 text-sky-700 ring-sky-200", acento: "bg-sky-600", borde: "border-t-sky-500" },
  PROCOMSA: { etiqueta: "Procomsa", submarca: "ICON", insignia: "bg-orange-50 text-orange-700 ring-orange-200", acento: "bg-orange-500", borde: "border-t-orange-400" },
  MYSMARTWINDOW: {
    etiqueta: "MySmartWindow",
    submarca: "Connect",
    insignia: "bg-teal-50 text-teal-700 ring-teal-200",
    acento: "bg-teal-600",
    borde: "border-t-teal-500",
  },
};

/// Clave de la familia de marca del catálogo (`FAMILIAS_DE_MARCA`) que corresponde a cada submarca.
export const FAMILIA_DE_MARCA: Record<MarcaCatalogo, string> = { VBH: "vbh", PROCOMSA: "procomsa", MYSMARTWINDOW: "mysmartwindow" };

export function InsigniaMarca({ marca }: { marca: MarcaCatalogo }) {
  const info = MARCA_INFO[marca];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${info.insignia}`}>
      {info.etiqueta} · {info.submarca}
    </span>
  );
}
