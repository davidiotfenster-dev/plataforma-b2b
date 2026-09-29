export type RolUsuario = "ADMIN_FENSTER" | "PARTNER_ADMIN" | "PARTNER_COMPRADOR" | "PARTNER_CONSULTA";

export type Idioma = "ES" | "EN" | "DE" | "IT" | "PT";

export type EstadoPartner = "PENDIENTE_VERIFICACION_EMAIL" | "PENDIENTE_APROBACION" | "ACTIVO" | "SUSPENDIDO" | "RECHAZADO";

export type EstadoPedido = "RECIBIDO" | "CONFIRMADO" | "EN_PREPARACION" | "PREPARADO" | "ENVIADO" | "CANCELADO";

export interface Perfil {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  idioma: Idioma;
  partnerId: string | null;
  partner: { razonSocial: string; marcaComercial: string | null; estado: EstadoPartner } | null;
}

export interface Producto {
  id: string;
  skuComercial: string;
  nombreComercial: string;
  imagenUrl: string | null;
  documentacionUrl: string | null;
  pvpBase: string;
  activo: boolean;
}

export interface ProductoDetalle extends Producto {
  productoBase: {
    skuIndustrial: string;
    nombreTecnico: string;
    especificacionesJson: Record<string, unknown> | null;
  } | null;
}

export interface LineaCarrito {
  id: string;
  representacionPartnerId: string;
  skuComercial: string;
  nombreComercial: string;
  imagenUrl: string | null;
  cantidad: number;
  pvpBase: string;
  descuentoPorcentaje: string;
  precioNetoUnitario: string;
  totalLinea: string;
}

export interface ResumenCarrito {
  cartId: string;
  items: LineaCarrito[];
  totalPedido: string;
}

export interface OrderItem {
  id: string;
  skuComercial: string;
  nombreProducto: string;
  pvpHistorico: string;
  descuentoAplicado: string;
  precioNetoUnitario: string;
  cantidad: number;
  totalLinea: string;
}

export const ESTADOS_PEDIDO: EstadoPedido[] = ["RECIBIDO", "CONFIRMADO", "EN_PREPARACION", "PREPARADO", "ENVIADO"];

export interface Order {
  id: string;
  codigoPed: string;
  partnerId: string;
  userId: string;
  estado: EstadoPedido;
  direccionEnvio: string;
  poNumber: string;
  notas: string | null;
  totalNeto: string;
  transportista: string | null;
  numeroExpedicion: string | null;
  trackingUrl: string | null;
  motivoCancelacion: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  partner?: { razonSocial: string };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  endpoint: string | null;
  method: string | null;
  statusCode: number | null;
  payload: Record<string, unknown> | null;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  emailVerificadoEn: string | null;
  createdAt: string;
}

export interface Estadisticas {
  totalPedidos: number;
  totalFacturado: string;
  porEstado: { estado: EstadoPedido; cantidad: number; totalNeto: string }[];
  porPartner: { partnerId: string; razonSocial: string; cantidad: number; totalNeto: string }[];
  pedidosPorDia: { dia: string; cantidad: number }[];
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductoBaseAdmin {
  id: string;
  skuIndustrial: string;
  nombreTecnico: string;
  activo: boolean;
  createdAt: string;
}

export interface RepresentacionAdmin {
  id: string;
  productoBaseId: string;
  skuComercial: string;
  nombreComercial: string;
  pvpBase: string;
  descuentoOverride: string | null;
  activo: boolean;
  productoBase: { id: string; skuIndustrial: string; nombreTecnico: string };
}

export interface Partner {
  id: string;
  razonSocial: string;
  cif: string;
  direccionFiscal: string;
  pais: string;
  dominioWeb: string;
  codigoCliente: string | null;
  marcaComercial: string | null;
  tarifa: string | null;
  descuentoPorcentaje: string;
  notas: string | null;
  estado: EstadoPartner;
  createdAt: string;
}
