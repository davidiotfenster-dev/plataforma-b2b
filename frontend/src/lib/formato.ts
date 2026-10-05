import { useMemo } from "react";
import { useLocale } from "next-intl";

/// Importes en euros con el formato del idioma de la pantalla y siempre con dos
/// decimales: «1.234,50 €» en español, «€1,234.50» en inglés, igual que en el PDF
/// del pedido (por eso los miles se separan también con cuatro cifras). La API
/// manda los precios como texto decimal tal cual los guarda la base ("73.8").
/// El portugués del portal es el de Portugal: con "pt" a secas Intl usa el formato
/// de Brasil (€ delante).
const FORMATO_REGIONAL: Record<string, string> = { pt: "pt-PT" };

export function usePrecio(): (valor: string | number) => string {
  const locale = useLocale();
  return useMemo(() => {
    const euros = new Intl.NumberFormat(FORMATO_REGIONAL[locale] ?? locale, { style: "currency", currency: "EUR", useGrouping: "always" });
    return (valor) => euros.format(Number(valor));
  }, [locale]);
}
