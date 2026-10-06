/// Tipos del contrato v1 de la API de Partners (documento "Partners API MOCK v1.1",
/// 6-10-2026), sacados de las respuestas reales del Lambda MOCK. Importes y
/// porcentajes viajan como string decimal ("1250.00"); fechas en ISO 8601 UTC.

export type Decimal = string;
export type FechaIso = string;
export type Rol = 'ADMIN_FENSTER' | 'COMERCIAL' | 'PARTNER_ADMIN' | 'PARTNER_COMPRADOR' | 'PARTNER_CONSULTA';
export type EstadoEmpresa = 'PENDIENTE_VERIFICACION_EMAIL' | 'PENDIENTE_APROBACION' | 'ACTIVO' | 'SUSPENDIDO' | 'RECHAZADO';
export type EstadoPedido = 'RECIBIDO' | 'CONFIRMADO' | 'EN_PREPARACION' | 'PREPARADO' | 'ENVIADO' | 'CANCELADO';
export type Idioma = 'ES' | 'EN' | 'DE' | 'IT' | 'PT';
export type TipoEmpresa = 'PARTNER' | 'DISTRIBUIDOR';
export type Marca = 'VBH' | 'PROCOMSA' | 'MYSMARTWINDOW';

export interface Listado<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface Paginacion {
  page?: number;
  limit?: number;
}

// --- AUTH -------------------------------------------------------------------

export interface LoginContexto {
  userId: string;
  email: string;
  passwordHash: string;
  rol: Rol;
  activo: boolean;
  emailVerificado: boolean;
  partnerId: string | null;
  partnerEstado: EstadoEmpresa | null;
  partnerArchivadoEn: FechaIso | null;
}

export interface Sesion {
  activo: boolean;
  sesionInvalidadaEn: FechaIso | null;
  rol: Rol;
  partnerId: string | null;
  partner: { estado: EstadoEmpresa; archivadoEn: FechaIso | null } | null;
  perfil?: {
    id: string;
    email: string;
    nombre: string | null;
    idioma: Idioma;
    partner: { id: string; razonSocial: string; marcaComercial: string | null; direccionEnvio: string | null } | null;
  };
}

export interface CuentaEncontrada {
  userId: string;
  email: string;
  idioma: Idioma;
  activo: boolean;
  emailVerificado: boolean;
  partnerId: string | null;
  partnerEstado: EstadoEmpresa | null;
  ultimoPasswordResetEmitidoEn: FechaIso | null;
}

export interface NuevoRegistro {
  partnerId: string;
  userId: string;
  razonSocial: string;
  cif: string;
  email: string;
  passwordHash: string;
  tokenVerificacion: string;
  [extra: string]: unknown;
}

export interface RegistroCreado {
  partnerId: string;
  userId: string;
  estado: EstadoEmpresa;
  email: string;
}

export interface EmailVerificado {
  verified: boolean;
  partner: { id: string; razonSocial: string; estado: EstadoEmpresa };
  emailsAdmins: string[];
}

export type AccionCuenta =
  | { action: 'invalidate-sessions' }
  | { action: 'set-language'; idioma: Idioma }
  | { action: 'store-token'; [dato: string]: unknown };

// --- CLIENTE (empresa) ------------------------------------------------------

export interface ProductoCatalogo {
  id: string;
  companyId: string;
  productoBaseId: string;
  skuComercial: string;
  nombreComercial: string;
  nombreTecnico: string;
  pvpBase: Decimal;
  descuentoAplicado: Decimal;
  precioNeto: Decimal;
  imagenUrl: string | null;
  activo: boolean;
}

export interface FichaProducto extends ProductoCatalogo {
  especificaciones?: Record<string, unknown>;
}

export interface UsuarioEmpresa {
  id: string;
  companyId: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  activo: boolean;
  idioma: Idioma;
}

export interface NuevoUsuarioEmpresa {
  userId: string;
  email: string;
  nombre?: string | null;
  rol: Rol;
  tokenInvitacion: string;
}

export interface LineaCarrito {
  id: string;
  representacionId: string;
  productoBaseId: string;
  skuComercial: string;
  nombreProducto: string;
  cantidad: number;
  precioNetoUnitario: Decimal;
  totalLinea: Decimal;
  disponible: boolean;
}

export interface Carrito {
  id: string;
  companyId: string;
  userId: string;
  items: LineaCarrito[];
  totalNeto: Decimal;
}

export type AccionCarrito =
  | { action: 'add'; repId: string; cantidad: number }
  | { action: 'set-quantity'; repId: string; cantidad: number }
  | { action: 'remove'; repId: string }
  | { action: 'repeat-order'; orderId: string };

export interface ConfirmarPedido {
  userId: string;
  direccionEnvio: string;
  poNumber: string;
  notas: string | null;
  /// Total neto que vio el usuario: si no coincide, 409 PRECIOS_CAMBIADOS.
  totalEsperado: Decimal;
}

export interface LineaPedido {
  id: string;
  skuComercial: string;
  nombreProducto: string;
  pvpHistorico: Decimal;
  descuentoAplicado: Decimal;
  precioNetoUnitario: Decimal;
  cantidad: number;
  totalLinea: Decimal;
}

export interface Pedido {
  id: string;
  codigoPed: string;
  companyId: string;
  userId: string;
  estado: EstadoPedido;
  poNumber: string;
  direccionEnvio: string;
  notas: string | null;
  totalNeto: Decimal;
  transportista: string | null;
  numeroExpedicion: string | null;
  trackingUrl: string | null;
  motivoCancelacion: string | null;
  createdAt: FechaIso;
  updatedAt: FechaIso;
  lineas: LineaPedido[];
  historial: { estado: EstadoPedido; createdAt: FechaIso }[];
}

/// Respuesta de confirmar: lo necesario para el PDF y los correos.
export interface PedidoConfirmado extends Pedido {
  usuario: { email: string; idioma: Idioma };
  razonSocial: string;
  emailsAdmins: string[];
}

export interface ResumenPedido {
  id: string;
  codigoPed: string;
  estado: EstadoPedido;
  totalNeto: Decimal;
  createdAt: FechaIso;
}

export interface PedidosEmpresa extends Listado<ResumenPedido> {
  summary: Record<EstadoPedido, number>;
  enviadosUltimos7Dias: number;
}

// --- ADMIN ------------------------------------------------------------------

export interface Empresa {
  id: string;
  razonSocial: string;
  cif: string;
  tipo: TipoEmpresa;
  marcaCatalogo: Marca | null;
  estado: EstadoEmpresa;
  descuentoPorcentaje: Decimal;
  codigoCliente: string | null;
  direccionFiscal: string | null;
  direccionEnvio: string | null;
  archivadoEn: FechaIso | null;
  createdAt: FechaIso;
  updatedAt: FechaIso;
  counts?: { users: number; products: number; orders: number };
}

export interface FichaEmpresa extends Empresa {
  volumenCompras?: Decimal;
}

export interface SincronizacionCatalogo {
  triggered?: boolean;
  created: number;
  updated: number;
  removed: number;
  conflicts: unknown[];
}

export interface NuevaEmpresa {
  companyId: string;
  userId: string;
  razonSocial: string;
  cif: string;
  tipo: TipoEmpresa;
  marcaCatalogo: Marca;
  descuentoPorcentaje: Decimal;
  [extra: string]: unknown;
}

export interface EmpresaCreada {
  company: Empresa;
  user: { id: string; email: string; rol: Rol; activo: boolean };
  catalogSync: SincronizacionCatalogo;
}

export interface CambiosEmpresa {
  /// Bloqueo optimista: el `updatedAt` que se leyó. Si cambió, 409 CONFLICTO_VERSION.
  expectedUpdatedAt: FechaIso;
  [campo: string]: unknown;
}

export interface TransicionEmpresa {
  action: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'archive' | 'unarchive' | (string & {});
  expectedState: EstadoEmpresa;
  data?: Record<string, unknown>;
}

export interface ResultadoTransicionEmpresa {
  company: Empresa;
  action: string;
  catalogSync?: SincronizacionCatalogo;
  notify?: { email: string; idioma: Idioma }[];
}

export interface EventoAuditoria {
  eventId: string;
  timestamp: FechaIso;
  eventType: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  userId: string | null;
  partnerId: string | null;
  requestId: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
  [extra: string]: unknown;
}

export interface ProductoCatalogoEmpresaAdmin {
  id: string;
  productoBaseId: string;
  skuComercial: string;
  nombreComercial: string;
  activo: boolean;
  pvpBase: Decimal;
  descuentoOverride?: Decimal | null;
}

export interface AccionCatalogoEmpresa {
  action: 'assign' | 'unassign' | 'update' | (string & {});
  products: { productoBaseId: string; [campo: string]: unknown }[];
}

export interface ProductoBase {
  id: string;
  skuIndustrial: string;
  nombreTecnico: string;
  pvpTarifa: Decimal;
  companiesCount?: number;
  activo: boolean;
  imagenUrl: string | null;
}

export interface AccionProducto {
  action: 'create' | 'update' | 'delete' | (string & {});
  productId: string;
  data?: Record<string, unknown>;
}

export interface ProductoMarca {
  id: string;
  productoBaseId: string;
  skuComercial: string;
  nombreComercial: string;
  pvpBase: Decimal;
  activo: boolean;
}

export interface AccionCatalogoMarca {
  action: 'add' | 'update' | 'remove' | (string & {});
  productoBaseId: string;
  [campo: string]: unknown;
}

export type ProcesoMarca =
  | { action: 'fill' }
  | { action: 'apply-rate'; simulate: boolean; data: { ratePercent: Decimal | number } };

export interface ResultadoProcesoMarca {
  success: boolean;
  brand: string;
  action: string;
  simulate: boolean;
  processed: number;
  created: number;
  updated: number;
  removed: number;
  conflicts: unknown[];
}

export interface PedidoAdmin extends Pedido {
  company?: Empresa;
  user?: { id: string; email: string; nombre: string | null; idioma: Idioma };
}

export interface TransicionPedido {
  expectedState: EstadoPedido;
  newState: EstadoPedido;
  force?: boolean;
  motivoCancelacion?: string;
  shipping?: { transportista: string; numeroExpedicion: string; trackingUrl?: string | null };
}

export interface FiltrosEstadisticas {
  desde?: string;
  hasta?: string;
  granularidad?: 'day' | 'week' | 'month';
  marca?: Marca;
  partnerId?: string;
}

export interface Estadisticas {
  filtros: Record<string, unknown>;
  kpis: { pedidos: number; totalNeto: Decimal; partnersActivos: number; ticketMedio: Decimal };
  previousPeriod: { pedidos: number; totalNeto: Decimal };
  series: { periodo: string; pedidos: number; totalNeto: Decimal }[];
  byStatus: { estado: EstadoPedido; pedidos: number }[];
  byCompany: { companyId: string; razonSocial: string; pedidos: number; totalNeto: Decimal }[];
  byProduct: { productId: string; nombre: string; unidades: number; totalNeto: Decimal }[];
  companies: { id: string; razonSocial: string }[];
}

export interface ExportacionEstadisticas {
  rankings: {
    companies: { companyId: string; razonSocial: string; totalNeto: Decimal }[];
    products: { productId: string; nombre: string; unidades: number; totalNeto: Decimal }[];
  };
  orders: { codigoPed: string; razonSocial: string; estado: EstadoPedido; totalNeto: Decimal; createdAt: FechaIso }[];
}
