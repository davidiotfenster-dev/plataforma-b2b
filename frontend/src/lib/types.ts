export type RolUsuario = "ADMIN_FENSTER" | "COMERCIAL" | "PARTNER_ADMIN" | "PARTNER_COMPRADOR" | "PARTNER_CONSULTA";

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
    especificacionesJson: Record<string, string | number | boolean> | null;
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
  especificacionesJson?: EspecificacionesDispositivo | null;
  /// PVP de la tarifa oficial (igual para todos los partners); null = sin precio en tarifa.
  pvpTarifa?: string | null;
  _count?: { representaciones: number };
}

/// Ficha que carga `npm run import:dispositivos` en `especificacionesJson`.
export interface EspecificacionesDispositivo {
  grupo?: string;
  color?: string | null;
  pendiente?: string;
  /// 'todos' = se asigna a cualquier partner aunque no tenga nombre en su marca.
  ambito?: string;
  referencias?: ReferenciaMarca[];
  /// Lo único que ve el partner en la ficha del producto (lista blanca del backend).
  publicas?: Record<string, string | number | boolean>;
}

/// Cómo se llama (y qué códigos tiene) un mismo aparato en una marca concreta.
export interface ReferenciaMarca {
  marca: string;
  nombre: string;
  refInterna: string;
  gtin: string | null;
}

/// Asignación de un producto base a un partner, vista desde el producto.
export interface RepresentacionDeBase {
  id: string;
  partnerId: string;
  skuComercial: string;
  nombreComercial: string;
  pvpBase: string;
  descuentoOverride: string | null;
  activo: boolean;
  partner: { id: string; razonSocial: string; marcaComercial: string | null; estado: EstadoPartner };
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
  telefono1: string | null;
  telefono2: string | null;
  codigoPostal: string | null;
  localidad: string | null;
  provincia: string | null;
  direccionEnvioDefecto: string | null;
  codigoPostalEnvio: string | null;
  localidadEnvio: string | null;
  provinciaEnvio: string | null;
  paisEnvio: string | null;
  correoContacto1: string | null;
  correoContacto2: string | null;
  correoFacturacion: string | null;
  formaPago: string | null;
  divisa: string | null;
  iva: string | null;
  notas: string | null;
  estado: EstadoPartner;
  creadoPorUsuarioId: string | null;
  createdAt: string;
  /// Cuántos usuarios, productos de catálogo y pedidos tiene (el listado y la ficha los traen ya contados).
  _count?: { usuarios: number; representaciones: number; ordenes: number };
}

/// Cifras de las pestañas del panel de partners (`GET /partners/resumen`).
export interface ResumenPartners {
  total: number;
  porEstado: Record<EstadoPartner, number>;
  /// Partners con datos provisionales (CIF, dominio o dirección "PENDIENTE").
  datosPorCompletar: number;
}

export interface CrearPartnerInput {
  razonSocial: string;
  cif: string;
  direccionFiscal: string;
  pais: string;
  dominioWeb: string;
  codigoCliente?: string;
  marcaComercial?: string;
  tarifa?: string;
  descuentoPorcentaje?: number;
  telefono1?: string;
  telefono2?: string;
  codigoPostal?: string;
  localidad?: string;
  provincia?: string;
  direccionEnvioDefecto?: string;
  codigoPostalEnvio?: string;
  localidadEnvio?: string;
  provinciaEnvio?: string;
  paisEnvio?: string;
  correoContacto1?: string;
  correoContacto2?: string;
  correoFacturacion?: string;
  formaPago?: string;
  divisa?: string;
  iva?: number;
  notas?: string;
  nombreUsuario: string;
  emailUsuario: string;
  passwordUsuario: string;
}
