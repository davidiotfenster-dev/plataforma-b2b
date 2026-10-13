import { Injectable } from '@nestjs/common';
import { PartnersApiClient, segmento, type Actor, type ValorQuery } from './partners-api.client.js';
import type {
  AccionCatalogoEmpresa,
  AccionCatalogoMarca,
  AccionProducto,
  CambiosEmpresa,
  Empresa,
  EmpresaCreada,
  Estadisticas,
  EventoAuditoria,
  ExportacionEstadisticas,
  FichaEmpresa,
  FiltrosEstadisticas,
  Idioma,
  JobMarca,
  Listado,
  ListadoEmpresas,
  NuevaEmpresa,
  PedidoAdmin,
  ProcesoMarca,
  ProductoBase,
  ProductoCatalogo,
  ProductoMarca,
  ResultadoCatalogoEmpresa,
  ResultadoCatalogoMarca,
  ResultadoProducto,
  ResultadoTransicionEmpresa,
  Rol,
  SincronizacionCatalogo,
  TransicionEmpresa,
  TransicionPedido,
} from './partners-api.tipos.js';

type Filtros = Record<string, ValorQuery>;

/// Rutas 17-37 del contrato v1: panel de administración de IoT FENSTER.
@Injectable()
export class PartnersApiAdminRepository {
  constructor(private readonly api: PartnersApiClient) {}

  // --- Empresas ---

  /// 17. Listado de empresas (filtros: estado, tipo, archivadas, busqueda, datosPorCompletar,
  /// createdBy, include=summary, page, limit).
  empresas(filtros: Filtros = {}): Promise<ListadoEmpresas> {
    return this.api.get('/admin/companies', filtros);
  }

  /// 18. Alta directa de empresa [Idem].
  crearEmpresa(datos: NuevaEmpresa, actor: Actor, idempotencyKey: string | true = true): Promise<EmpresaCreada> {
    return this.api.peticion('POST', '/admin/companies', { body: datos, actor, idempotente: idempotencyKey });
  }

  /// 19. Ficha de empresa.
  empresa(id: string): Promise<FichaEmpresa> {
    return this.api.get(`/admin/companies/${segmento(id)}`);
  }

  /// 20. Actualizar ficha [Idem] con bloqueo optimista (`expectedUpdatedAt`).
  actualizarEmpresa(
    id: string,
    cambios: CambiosEmpresa,
    actor: Actor,
    idempotencyKey: string | true = true,
  ): Promise<{ company: Empresa; catalogSync: SincronizacionCatalogo }> {
    return this.api.peticion('PUT', `/admin/companies/${segmento(id)}`, { body: cambios, actor, idempotente: idempotencyKey });
  }

  /// 21. Eliminar empresa: hay que repetir la razón social como confirmación.
  eliminarEmpresa(id: string, confirmarRazonSocial: string, actor: Actor): Promise<{ deleted: boolean; id: string }> {
    return this.api.peticion('DELETE', `/admin/companies/${segmento(id)}`, { body: { confirmarRazonSocial }, actor });
  }

  /// 22. Transición de estado de empresa (aprobar, rechazar, suspender…) [Idem].
  transicionEmpresa(id: string, transicion: TransicionEmpresa, actor: Actor, idempotencyKey: string | true = true): Promise<ResultadoTransicionEmpresa> {
    return this.api.peticion('POST', `/admin/companies/${segmento(id)}/transition`, { body: transicion, actor, idempotente: idempotencyKey });
  }

  // --- Usuarios ---

  /// 23. Cambiar rol y/o activar-desactivar un usuario.
  accesoUsuario(userId: string, cambios: { rol?: Rol; activo?: boolean }, actor: Actor): Promise<{ id: string; rol: Rol; activo: boolean }> {
    return this.api.peticion('PATCH', `/admin/users/${segmento(userId)}/access`, { body: cambios, actor });
  }

  /// 24. Auditoría de un usuario.
  auditoriaUsuario(userId: string, filtros: Filtros = {}): Promise<Listado<EventoAuditoria>> {
    return this.api.get(`/admin/users/${segmento(userId)}/audit`, filtros);
  }

  // --- Catálogo de una empresa ---

  /// 25. Catálogo de una empresa visto por el admin.
  catalogoEmpresa(id: string, filtros: Filtros = {}): Promise<{ companyId: string; items: ProductoCatalogo[] }> {
    return this.api.get(`/admin/companies/${segmento(id)}/catalog`, filtros);
  }

  /// 26. Asignar / editar / quitar productos del catálogo de una empresa. Solo `assign` es [Idem].
  accionCatalogoEmpresa(id: string, accion: AccionCatalogoEmpresa, actor: Actor): Promise<ResultadoCatalogoEmpresa> {
    return this.api.peticion('POST', `/admin/companies/${segmento(id)}/catalog/action`, {
      body: accion,
      actor,
      idempotente: accion.action === 'assign',
    });
  }

  // --- Productos base ---

  /// 27. Productos base (catálogo maestro).
  productos(filtros: Filtros = {}): Promise<Listado<ProductoBase>> {
    return this.api.get('/admin/products', filtros);
  }

  /// 28. Crear / editar producto base, asignarlo a empresas (`bulk-assign`) o cambiar su foto (`set-image`).
  accionProducto(accion: AccionProducto, actor: Actor): Promise<ResultadoProducto> {
    return this.api.peticion('POST', '/admin/products/action', { body: accion, actor });
  }

  /// 29. Empresas que tienen un producto en su catálogo.
  empresasDeProducto(id: string): Promise<{ productId: string; items: { companyId: string; razonSocial: string; skuComercial: string; nombreComercial: string; precio: string }[] }> {
    return this.api.get(`/admin/products/${segmento(id)}/companies`);
  }

  // --- Catálogo por marca ---

  /// 30. Catálogo de una marca (VBH, PROCOMSA, MYSMARTWINDOW).
  catalogoMarca(marca: string, filtros: Filtros = {}): Promise<{ brand: string; items: ProductoMarca[]; partnersCount: number; distributorsCount: number }> {
    return this.api.get(`/admin/brands/${segmento(marca)}/catalog`, filtros);
  }

  /// 31. Añadir (varios a la vez) / editar / quitar productos del catálogo de la marca (se propaga a sus empresas).
  accionCatalogoMarca(marca: string, accion: AccionCatalogoMarca, actor: Actor): Promise<ResultadoCatalogoMarca> {
    return this.api.peticion('POST', `/admin/brands/${segmento(marca)}/catalog/action`, { body: accion, actor });
  }

  /// 32. Aplicar la tarifa a una marca (con simulación). Es un job asíncrono: responde 202 con el `jobId`
  /// y el resultado se consulta con `estadoJob`. Solo el job real (`simulate: false`) es [Idem].
  procesoMarca(marca: string, proceso: ProcesoMarca, actor: Actor, idempotencyKey: string | true = true): Promise<JobMarca> {
    return this.api.peticion('POST', `/admin/brands/${segmento(marca)}/jobs`, {
      body: proceso,
      actor,
      idempotente: proceso.simulate ? false : idempotencyKey,
    });
  }

  /// 32b. Estado y resultado de un job de marca.
  estadoJob(marca: string, jobId: string): Promise<JobMarca> {
    return this.api.get(`/admin/brands/${segmento(marca)}/jobs/${segmento(jobId)}`);
  }

  // --- Pedidos ---

  /// 33. Pedidos de todas las empresas.
  pedidos(filtros: Filtros = {}): Promise<Listado<PedidoAdmin>> {
    return this.api.get('/admin/orders', filtros);
  }

  /// 34. Detalle de pedido con empresa y usuario.
  pedido(orderId: string): Promise<PedidoAdmin> {
    return this.api.get(`/admin/orders/${segmento(orderId)}`);
  }

  /// 35. Cambiar estado del pedido [Idem] (ENVIADO lleva transportista, expedición y tracking).
  transicionPedido(
    orderId: string,
    transicion: TransicionPedido,
    actor: Actor,
    idempotencyKey: string | true = true,
  ): Promise<{ order: PedidoAdmin; notify: { email: string; idioma: Idioma } | null }> {
    return this.api.peticion('POST', `/admin/orders/${segmento(orderId)}/transition`, { body: transicion, actor, idempotente: idempotencyKey });
  }

  // --- Estadísticas ---

  /// 36. Estadísticas del panel.
  estadisticas(filtros: FiltrosEstadisticas = {}): Promise<Estadisticas> {
    return this.api.get('/admin/stats', { ...filtros });
  }

  /// 37. Datos para el Excel de estadísticas.
  exportacionEstadisticas(filtros: FiltrosEstadisticas = {}): Promise<ExportacionEstadisticas> {
    return this.api.get('/admin/stats/export', { ...filtros });
  }
}
