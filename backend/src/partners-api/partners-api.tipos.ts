/// Tipos del contrato v1 de la API de Partners (documento "Partners API MOCK v1.3",
/// 9-10-2026), sacados de las respuestas reales del Lambda MOCK. Importes y
/// porcentajes viajan como string decimal ("1250.00"); fechas en ISO 8601 UTC.

export type Decimal = string;
export type FechaIso = string;
export type Rol = 'ADMIN_FENSTER' | 'COMERCIAL' | 'PARTNER_ADMIN' | 'PARTNER_COMPRADOR' | 'PARTNER_CONSULTA';
export type EstadoEmpresa = 'PENDIENTE_VERIFICACION_EMAIL' | 'PENDIENTE_APROBACION' | 'ACTIVO' | 'SUSPENDIDO' | 'RECHAZADO';
export type EstadoPedido = 'RECIBIDO' | 'CONFIRMADO' | 'EN_PREPARACION' | 'PREPARADO' | 'ENVIADO' | 'CANCELADO';
export type Idioma = 'ES' | 'EN' | 'DE' | 'IT' | 'PT';
export type TipoEmpresa = 'PARTNER' | 'DISTRIBUIDOR';
export type Marca = 'VBH' | 'PROCOMSA' | 'MYSMARTWINDOW';
export type EspecificacionesJson = Record<string, unknown>;

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
  direccionFiscal: string;
  pais: string;
  dominioWeb: string;
  email: string;
  nombre: string;
  idioma?: Idioma;
  passwordHash: string;
  tokenVerificacion: string;
  tokenVerificacionExpira: FechaIso;
  /// Prueba de que el usuario aceptó las condiciones al registrarse.
  condicionesAceptadasEn: FechaIso;
}

export interface RegistroCreado {
  partnerId: string;
  userId: string;
  estado: EstadoEmpresa;
  email: string;
}

export interface EmailVerificado {
  verified: boolean;
  partner: { id: string; razonSocial: string; pais: string; estado: EstadoEmpresa };
  emailsAdmins: string[];
}

export type AccionCuenta =
  | { action: 'invalidate-sessions' }
  | { action: 'set-language'; idioma: Idioma }
  | { action: 'store-token'; tipo: 'VERIFICACION_EMAIL' | 'RESET_PASSWORD'; token: string; expiraEn: FechaIso };

// --- CLIENTE (empresa) ------------------------------------------------------

/// Producto base anidado en las respuestas de catálogo (foto, ficha técnica, SKU industrial).
export interface ProductoBaseResumen {
  id: string;
  skuIndustrial: string;
  nombreTecnico: string;
  pvpTarifa: Decimal;
  especificacionesJson: EspecificacionesJson | null;
  imagenUrl: string | null;
  documentacionUrl: string | null;
  activo: boolean;
  createdAt: FechaIso;
  updatedAt: FechaIso;
}

export interface ProductoCatalogo {
  id: string;
  companyId: string;
  productoBaseId: string;
  productoMarcaId: string | null;
  marca: Marca | null;
  skuComercial: string;
  nombreComercial: string;
  nombreTecnico: string;
  pvpBase: Decimal;
  descuentoAplicado: Decimal;
  descuentoOverride: Decimal | null;
  precioNeto: Decimal;
  imagenUrl: string | null;
  documentacionUrl: string | null;
  especificacionesJson: EspecificacionesJson | null;
  activo: boolean;
  productoBase: ProductoBaseResumen;
}

export interface FichaProducto extends ProductoCatalogo {
  /// La API lo repite con el nombre antiguo; usar `especificacionesJson`.
  especificaciones?: EspecificacionesJson;
}

export interface UsuarioEmpresa {
  id: string;
  companyId: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  activo: boolean;
  idioma: Idioma;
  emailVerificadoEn: FechaIso | null;
  createdAt: FechaIso;
}

export interface NuevoUsuarioEmpresa {
  userId: string;
  email: string;
  nombre?: string | null;
  rol: Rol;
  idioma?: Idioma;
  /// Hash de una contraseña aleatoria que nadie conoce: el usuario crea la suya con el enlace.
  passwordHash: string;
  tokenInvitacion: string;
  tokenInvitacionExpiraEn: FechaIso;
}

export interface LineaCarrito {
  id: string;
  representacionId: string;
  productoBaseId: string;
  skuComercial: string;
  nombreProducto: string;
  cantidad: number;
  imagenUrl: string | null;
  pvpBase: Decimal;
  descuento: Decimal;
  descuentoAplicado: Decimal;
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

/// `itemId` es el id de la línea del carrito (`items[].id` de la ruta 12), no el de la representación.
export type AccionCarrito =
  | { action: 'add'; repId: string; cantidad: number }
  | { action: 'set-quantity'; itemId: string; cantidad: number }
  | { action: 'remove'; itemId: string }
  | { action: 'repeat-order'; orderId: string };

/// Respuesta de las acciones del carrito; `repeat-order` añade qué se pudo repetir y qué no.
export interface CarritoConAvisos extends Carrito {
  action?: string;
  agregadas?: number;
  noDisponibles?: string[];
  preciosCambiados?: { nombre: string; anterior: Decimal; actual: Decimal }[];
}

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
  imagenUrl: string | null;
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
  razonSocial: string;
  estado: EstadoPedido;
  poNumber: string;
  direccionEnvio: string;
  notas: string | null;
  totalNeto: Decimal;
  transportista: string | null;
  numeroExpedicion: string | null;
  trackingUrl: string | null;
  motivoCancelacion: string | null;
  numeroArticulos: number;
  resumenProductos: string;
  createdAt: FechaIso;
  updatedAt: FechaIso;
  lineas: LineaPedido[];
  historial: { estado: EstadoPedido; createdAt: FechaIso }[];
}

/// Respuesta de confirmar: lo necesario para el PDF y los correos.
export interface PedidoConfirmado extends Pedido {
  usuario: { email: string; idioma: Idioma };
  emailsAdmins: string[];
}

export interface PedidosEmpresa extends Listado<Pedido> {
  summary: Record<EstadoPedido, number>;
  enviadosUltimos7Dias: number;
}

// --- ADMIN ------------------------------------------------------------------

/// Campos de la ficha de empresa que se pueden dejar vacíos (`null` los vacía en una edición).
export interface CamposFicha {
  codigoCliente?: string | null;
  marcaComercial?: string | null;
  tarifa?: string | null;
  telefono1?: string | null;
  telefono2?: string | null;
  codigoPostal?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  direccionEnvioDefecto?: string | null;
  codigoPostalEnvio?: string | null;
  localidadEnvio?: string | null;
  provinciaEnvio?: string | null;
  paisEnvio?: string | null;
  correoContacto1?: string | null;
  correoContacto2?: string | null;
  correoFacturacion?: string | null;
  formaPago?: string | null;
  divisa?: string | null;
  iva?: Decimal | null;
  notas?: string | null;
}

export interface DatosFiscales {
  razonSocial: string;
  cif: string;
  direccionFiscal: string;
  pais: string;
  dominioWeb: string;
}

export interface Empresa extends DatosFiscales {
  id: string;
  tipo: TipoEmpresa;
  marcaCatalogo: Marca | null;
  estado: EstadoEmpresa;
  descuentoPorcentaje: Decimal;
  marcaComercial: string | null;
  tarifa: string | null;
  codigoCliente: string | null;
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
  iva: Decimal | null;
  notas: string | null;
  creadoPorUsuarioId: string | null;
  condicionesAceptadasEn: FechaIso | null;
  archivadoEn: FechaIso | null;
  createdAt: FechaIso;
  updatedAt: FechaIso;
  counts?: { users: number; products: number; orders: number };
}

/// `?include=summary` del listado: totales por estado, más las empresas con datos por completar y las archivadas.
export type ResumenEmpresas = Record<EstadoEmpresa, number> & { total: number; datosPorCompletar: number; archivadas: number };

export interface ListadoEmpresas extends Listado<Empresa> {
  summary?: ResumenEmpresas;
}

export interface FichaEmpresa extends Empresa {
  volumenCompras: { unidades: number; pedidos: number };
}

export interface SincronizacionCatalogo {
  triggered?: boolean;
  created: number;
  updated: number;
  removed: number;
  conflicts: unknown[];
}

export interface NuevaEmpresa extends DatosFiscales, CamposFicha {
  companyId: string;
  tipo: TipoEmpresa;
  marcaCatalogo: Marca;
  descuentoPorcentaje?: Decimal;
  /// Primer usuario de la empresa (administrador).
  usuario: { userId: string; email: string; nombre: string; passwordHash: string; idioma?: Idioma };
}

export interface EmpresaCreada {
  company: Empresa;
  user: UsuarioEmpresa;
  catalogSync: SincronizacionCatalogo;
}

/// `estado`, `tipo` y `archivadoEn` no se editan aquí: van por la transición (ruta 22).
export interface CambiosEmpresa extends Partial<DatosFiscales>, CamposFicha {
  /// Bloqueo optimista: el `updatedAt` que se leyó. Si cambió, 409 CONFLICTO_VERSION.
  expectedUpdatedAt: FechaIso;
  marcaCatalogo?: Marca;
  descuentoPorcentaje?: Decimal;
}

export interface DatosAprobacion {
  marcaComercial: string;
  tarifa: string;
  descuentoPorcentaje: Decimal;
  marcaCatalogo?: Marca;
}

export type TransicionEmpresa =
  | { action: 'approve'; expectedState: EstadoEmpresa; data: DatosAprobacion }
  | { action: 'reject' | 'suspend' | 'reactivate' | 'archive' | 'unarchive' | 'promote' | 'demote'; expectedState: EstadoEmpresa };

export interface ResultadoTransicionEmpresa {
  company: Empresa;
  action: string;
  catalogSync?: SincronizacionCatalogo;
  /// Usuarios con email verificado a quienes avisar (solo en `approve` y `reject`).
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

export interface ProductoAsignado {
  productoBaseId: string;
  skuComercial: string;
  nombreComercial: string;
  pvpBase: Decimal;
  descuentoOverride?: Decimal | null;
}

export interface CambiosProductoEmpresa {
  skuComercial?: string;
  nombreComercial?: string;
  pvpBase?: Decimal;
  /// `null` quita el descuento propio del producto.
  descuentoOverride?: Decimal | null;
  activo?: boolean;
}

export type AccionCatalogoEmpresa =
  | { action: 'assign'; products: ProductoAsignado[] }
  | { action: 'update'; repId: string; data: CambiosProductoEmpresa }
  | { action: 'remove'; repId: string }
  | { action: 'remove-extras' };

export interface ResultadoCatalogoEmpresa {
  success: boolean;
  companyId: string;
  action: string;
  affected: number;
  catalog: ProductoCatalogo[];
}

export interface ProductoBase extends ProductoBaseResumen {
  companiesCount?: number;
}

export interface DatosProductoBase {
  nombreTecnico?: string;
  especificacionesJson?: EspecificacionesJson | null;
  pvpTarifa?: Decimal;
  imagenUrl?: string | null;
  activo?: boolean;
}

export type AccionProducto =
  | { action: 'create'; productId: string; data: DatosProductoBase & { skuIndustrial: string; nombreTecnico: string } }
  | { action: 'update'; productId: string; data: DatosProductoBase }
  | {
      action: 'bulk-assign';
      productId: string;
      /// Sin `companyIds`: todas las empresas activas y no archivadas.
      data: { companyIds?: string[]; skuComercial: string; nombreComercial: string; pvpBase: Decimal; descuentoOverride?: Decimal | null };
    }
  /// Una misma foto para varios productos (1 a 200); `null` quita la foto.
  | { action: 'set-image'; productIds: string[]; imagenUrl: string | null };

export interface ResultadoProducto {
  success: boolean;
  action: string;
  product?: ProductoBase;
  /// bulk-assign
  assigned?: number;
  skipped?: number;
  /// set-image: cuántos productos cambian y qué fotos ya no usa nadie.
  updated?: number;
  orphanImages?: string[];
}

export interface ProductoMarca {
  id: string;
  productoBaseId: string;
  skuComercial: string;
  nombreComercial: string;
  pvpBase: Decimal;
  activo: boolean;
  productoBase: ProductoBaseResumen;
}

export interface ItemCatalogoMarca {
  productoBaseId: string;
  skuComercial: string;
  nombreComercial: string;
  pvpBase: Decimal;
  documentacionUrl?: string | null;
}

export type AccionCatalogoMarca =
  | { action: 'add'; items: ItemCatalogoMarca[] }
  | {
      action: 'update';
      productoMarcaId: string;
      data: { skuComercial?: string; nombreComercial?: string; pvpBase?: Decimal; documentacionUrl?: string | null; activo?: boolean };
    }
  | { action: 'remove'; productoMarcaId: string };

export interface ResultadoCatalogoMarca {
  success: boolean;
  brand: string;
  action: string;
  added?: number;
  removed?: number;
  empresasAfectadas?: number;
  sync: SincronizacionCatalogo;
}

/// Sin porcentaje: copia el PVP de tarifa de cada producto base al catálogo de la marca. `fill` ya no existe
/// en la API (da 422): lo calcula NestJS y lo manda como `add` con `items[]`. `simulate` es obligatorio y
/// con `simulate: false` la API exige `Idempotency-Key` (solo un job real por marca: si no, 409 JOB_ALREADY_RUNNING).
export type ProcesoMarca = { action: 'apply-rate'; simulate: boolean };

export type EstadoJob = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';

export interface ResultadoJobMarca {
  processed: number;
  created: number;
  updated: number;
  removed: number;
  conflicts: unknown[];
  /// Precios que cambian (o cambiarían, con `simulate: true`).
  changes: { skuComercial: string; antes: Decimal; despues: Decimal }[];
}

/// Job de marca. El POST responde 202 con el job en `QUEUED` y `result: null` (el Gateway corta a los 29 s);
/// el resultado se consulta con `GET /admin/brands/{brand}/jobs/{jobId}` hasta `DONE` o `FAILED`.
export interface JobMarca {
  jobId: string;
  status: EstadoJob;
  brand: string;
  action: 'apply-rate';
  simulate: boolean;
  createdAt: FechaIso;
  result: ResultadoJobMarca | null;
  /// Con `FAILED`. La forma exacta no está definida en el contrato (siempre `null` en los ejemplos).
  error: Record<string, unknown> | null;
  /// Solo en la respuesta inicial.
  statusUrl?: string;
}

export interface PedidoAdmin extends Pedido {
  company?: Empresa;
  user?: UsuarioEmpresa;
}

export interface TransicionPedido {
  expectedState: EstadoPedido;
  newState: EstadoPedido;
  /// Solo se guarda en la auditoría: la máquina de estados la valida NestJS.
  force?: boolean;
  motivoCancelacion?: string;
  /// Obligatorio con `newState = ENVIADO` (los tres campos).
  shipping?: { transportista: string; numeroExpedicion: string; trackingUrl: string };
}

export interface FiltrosEstadisticas {
  desde?: string;
  hasta?: string;
  marca?: Marca;
  partnerId?: string;
  /// Recorta los rankings (en pantalla, 10).
  limite?: number;
}

export interface KpisEstadisticas {
  pedidos: number;
  facturado: Decimal;
  ticketMedio: Decimal;
  unidades: number;
  sinEnviar: number;
  cancelados: number;
}

export interface FilaEmpresaEstadisticas {
  companyId: string;
  razonSocial: string;
  marca: Marca | null;
  pedidos: number;
  unidades: number;
  facturado: Decimal;
}

export interface FilaMarcaEstadisticas {
  marca: Marca;
  pedidos: number;
  unidades: number;
  facturado: Decimal;
}

export interface FilaProductoEstadisticas {
  skuComercial: string;
  nombreProducto: string;
  unidades: number;
  facturado: Decimal;
}

export interface Estadisticas {
  filtros: Record<string, unknown>;
  /// Automática según el rango: día, semana o mes.
  granularidad: string;
  kpis: KpisEstadisticas;
  periodoAnterior: KpisEstadisticas;
  series: { periodo: string; pedidos: number; unidades: number; facturado: Decimal }[];
  byStatus: { estado: EstadoPedido; cantidad: number; facturado: Decimal }[];
  byCompany: FilaEmpresaEstadisticas[];
  byBrand: FilaMarcaEstadisticas[];
  byProduct: FilaProductoEstadisticas[];
  companies: { id: string; razonSocial: string }[];
}

export interface ExportacionEstadisticas {
  rankings: {
    companies: FilaEmpresaEstadisticas[];
    products: FilaProductoEstadisticas[];
    brands: FilaMarcaEstadisticas[];
  };
  orders: {
    codigoPed: string;
    createdAt: FechaIso;
    estado: EstadoPedido;
    poNumber: string;
    totalNeto: Decimal;
    razonSocial: string;
    marca: Marca | null;
    unidades: number;
  }[];
}

/// Ajustes legales (AJUSTES_LEGALES_API.md §1): los 13 campos de texto, todos opcionales y editables.
export const CAMPOS_AJUSTES_LEGALES = [
  'razonSocial',
  'cif',
  'domicilio',
  'emailContacto',
  'emailPrivacidad',
  'telefono',
  'registroMercantil',
  'alojamiento',
  'ciudadTribunales',
  'portes',
  'formaPago',
  'devoluciones',
  'plazoRegistros',
] as const;

export type CampoAjustesLegales = (typeof CAMPOS_AJUSTES_LEGALES)[number];

/// `id` y `updatedAt` van a `null` si todavía no existe la fila (el GET sigue siendo 200).
export type AjustesLegalesApi = Record<CampoAjustesLegales, string | null> & {
  id: string | null;
  updatedAt: FechaIso | null;
};

/// Cuerpo del PUT: `expectedUpdatedAt` es el `updatedAt` leído (o `null` si no hay fila) y
/// solo viajan los campos que cambian. Ausente = no cambia; `""` se guarda como `null`.
export type ActualizarAjustesLegalesApi = Partial<Record<CampoAjustesLegales, string | null>> & {
  expectedUpdatedAt: FechaIso | null;
};
