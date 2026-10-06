import { Idioma } from '../../generated/prisma/enums.js';

/// Rótulos del PDF del pedido y reglas de formato (fechas, importes) por idioma.
export interface TextosPdf {
  /// Idioma BCP 47 para las fechas.
  locale: string;
  separadorMiles: string;
  separadorDecimal: string;
  /// Moneda delante del importe ("€1,234.50") o detrás ("1.234,50 €").
  monedaDelante: boolean;
  /// Espacio antes del "%" (10 % / 10%).
  espacioPorcentaje: boolean;
  tituloDocumento: (codigoPed: string) => string;
  cabecera: string;
  cliente: string;
  poNumber: string;
  fecha: string;
  direccion: string;
  notas: string;
  columnas: readonly [string, string, string, string, string, string, string];
  totalNeto: string;
  linea: [singular: string, plural: string];
  unidad: [singular: string, plural: string];
  pie: string;
  pagina: (actual: number, total: number) => string;
}

const TEXTOS: Record<Idioma, TextosPdf> = {
  ES: {
    locale: 'es-ES',
    separadorMiles: '.',
    separadorDecimal: ',',
    monedaDelante: false,
    espacioPorcentaje: true,
    tituloDocumento: (c) => `Pedido ${c}`,
    cabecera: 'CONFIRMACIÓN DE PEDIDO',
    cliente: 'CLIENTE',
    poNumber: 'PO NUMBER',
    fecha: 'FECHA DEL PEDIDO',
    direccion: 'DIRECCIÓN DE ENVÍO',
    notas: 'NOTAS DEL PEDIDO',
    columnas: ['Referencia', 'Producto', 'Cant.', 'PVP', 'Dto.', 'Neto ud.', 'Total'],
    totalNeto: 'TOTAL NETO DEL PEDIDO',
    linea: ['línea', 'líneas'],
    unidad: ['unidad', 'unidades'],
    pie: 'IoT FENSTER · Resumen del pedido generado automáticamente por el Portal Partner',
    pagina: (a, t) => `Página ${a} de ${t}`,
  },
  EN: {
    locale: 'en-GB',
    separadorMiles: ',',
    separadorDecimal: '.',
    monedaDelante: true,
    espacioPorcentaje: false,
    tituloDocumento: (c) => `Order ${c}`,
    cabecera: 'ORDER CONFIRMATION',
    cliente: 'CUSTOMER',
    poNumber: 'PO NUMBER',
    fecha: 'ORDER DATE',
    direccion: 'SHIPPING ADDRESS',
    notas: 'ORDER NOTES',
    columnas: ['Reference', 'Product', 'Qty', 'RRP', 'Disc.', 'Net/unit', 'Total'],
    totalNeto: 'ORDER NET TOTAL',
    linea: ['line', 'lines'],
    unidad: ['unit', 'units'],
    pie: 'IoT FENSTER · Order summary generated automatically by the Partner Portal',
    pagina: (a, t) => `Page ${a} of ${t}`,
  },
  DE: {
    locale: 'de-DE',
    separadorMiles: '.',
    separadorDecimal: ',',
    monedaDelante: false,
    espacioPorcentaje: true,
    tituloDocumento: (c) => `Bestellung ${c}`,
    cabecera: 'BESTELLBESTÄTIGUNG',
    cliente: 'KUNDE',
    poNumber: 'PO-NUMMER',
    fecha: 'BESTELLDATUM',
    direccion: 'LIEFERADRESSE',
    notas: 'BESTELLHINWEISE',
    columnas: ['Artikelnr.', 'Produkt', 'Menge', 'UVP', 'Rabatt', 'Netto/Stk.', 'Gesamt'],
    totalNeto: 'NETTOGESAMTBETRAG',
    linea: ['Position', 'Positionen'],
    unidad: ['Stück', 'Stück'],
    pie: 'IoT FENSTER · Vom Partnerportal automatisch erstellte Bestellübersicht',
    pagina: (a, t) => `Seite ${a} von ${t}`,
  },
  IT: {
    locale: 'it-IT',
    separadorMiles: '.',
    separadorDecimal: ',',
    monedaDelante: false,
    espacioPorcentaje: true,
    tituloDocumento: (c) => `Ordine ${c}`,
    cabecera: "CONFERMA D'ORDINE",
    cliente: 'CLIENTE',
    poNumber: 'PO NUMBER',
    fecha: "DATA DELL'ORDINE",
    direccion: 'INDIRIZZO DI SPEDIZIONE',
    notas: "NOTE DELL'ORDINE",
    columnas: ['Riferimento', 'Prodotto', 'Q.tà', 'Listino', 'Sconto', 'Netto un.', 'Totale'],
    totalNeto: "TOTALE NETTO DELL'ORDINE",
    linea: ['riga', 'righe'],
    unidad: ['unità', 'unità'],
    pie: "IoT FENSTER · Riepilogo dell'ordine generato automaticamente dal Portale Partner",
    pagina: (a, t) => `Pagina ${a} di ${t}`,
  },
  PT: {
    locale: 'pt-PT',
    separadorMiles: '.',
    separadorDecimal: ',',
    monedaDelante: false,
    espacioPorcentaje: true,
    tituloDocumento: (c) => `Encomenda ${c}`,
    cabecera: 'CONFIRMAÇÃO DE ENCOMENDA',
    cliente: 'CLIENTE',
    poNumber: 'PO NUMBER',
    fecha: 'DATA DA ENCOMENDA',
    direccion: 'MORADA DE ENVIO',
    notas: 'NOTAS DA ENCOMENDA',
    columnas: ['Referência', 'Produto', 'Qtd.', 'PVP', 'Desc.', 'Líquido un.', 'Total'],
    totalNeto: 'TOTAL LÍQUIDO DA ENCOMENDA',
    linea: ['linha', 'linhas'],
    unidad: ['unidade', 'unidades'],
    pie: 'IoT FENSTER · Resumo da encomenda gerado automaticamente pelo Portal Parceiro',
    pagina: (a, t) => `Página ${a} de ${t}`,
  },
};

export function textosPdf(idioma: Idioma | undefined): TextosPdf {
  return TEXTOS[idioma ?? Idioma.ES];
}

/// 1234.5 -> "1.234,50 €" (o "€1,234.50" en inglés). Con separador de miles
/// siempre: `Intl` lo omite en importes de 4 cifras y la columna quedaría desigual.
export function formatearEuros(valor: string, t: TextosPdf): string {
  const n = Number(valor);
  const [entero, decimales] = Math.abs(n).toFixed(2).split('.');
  const cifras = `${entero.replace(/\B(?=(\d{3})+(?!\d))/g, t.separadorMiles)}${t.separadorDecimal}${decimales}`;
  const signo = n < 0 ? '-' : '';
  return t.monedaDelante ? `${signo}€${cifras}` : `${signo}${cifras} €`;
}

/// Descuento como porcentaje; "—" si no hay.
export function formatearPorcentaje(valor: string, t: TextosPdf): string {
  const n = Number(valor);
  if (!(n > 0)) return '—';
  const cifras = String(Math.round(n * 100) / 100).replace('.', t.separadorDecimal);
  return `${cifras}${t.espacioPorcentaje ? ' ' : ''}%`;
}
