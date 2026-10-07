import { Injectable } from '@nestjs/common';
import { PartnersApiClient, segmento, type Actor } from './partners-api.client.js';
import type {
  AccionCarrito,
  Carrito,
  ConfirmarPedido,
  FichaProducto,
  Listado,
  NuevoUsuarioEmpresa,
  Paginacion,
  Pedido,
  PedidoConfirmado,
  PedidosEmpresa,
  ProductoCatalogo,
  UsuarioEmpresa,
} from './partners-api.tipos.js';

/// Acciones de carrito que se pueden repetir sin efecto doble: llevan Idempotency-Key
/// (y por tanto reintento). `add` y `repeat-order` no, para no sumar dos veces.
const ACCIONES_CARRITO_IDEMPOTENTES = new Set(['set-quantity', 'remove']);

/// Rutas 8-16 del contrato v1: lo que ve y hace una empresa cliente. El `companyId`
/// sale SIEMPRE de la sesión (JWT) en el controlador, nunca de la petición del
/// navegador: así la API solo devuelve datos de esa empresa (404 opaco si no).
@Injectable()
export class PartnersApiEmpresasRepository {
  constructor(private readonly api: PartnersApiClient) {}

  /// 8. Catálogo visible con precio neto ya calculado.
  catalogo(companyId: string, filtros: Paginacion & { q?: string } = {}): Promise<Listado<ProductoCatalogo>> {
    return this.api.get(`/companies/${segmento(companyId)}/catalog`, { ...filtros });
  }

  /// 9. Ficha de un producto del catálogo de la empresa.
  producto(companyId: string, repId: string): Promise<FichaProducto> {
    return this.api.get(`/companies/${segmento(companyId)}/catalog/${segmento(repId)}`);
  }

  /// 10. Usuarios de la empresa.
  usuarios(companyId: string): Promise<Listado<UsuarioEmpresa>> {
    return this.api.get(`/companies/${segmento(companyId)}/users`);
  }

  /// 11. Alta de usuario en la empresa [Idem].
  crearUsuario(companyId: string, datos: NuevoUsuarioEmpresa, actor: Actor, idempotencyKey: string | true = true): Promise<UsuarioEmpresa> {
    return this.api.peticion('POST', `/companies/${segmento(companyId)}/users`, { body: datos, actor, idempotente: idempotencyKey });
  }

  /// 12. Carrito completo del usuario.
  carrito(companyId: string, userId: string): Promise<Carrito> {
    return this.api.get(`/companies/${segmento(companyId)}/users/${segmento(userId)}/cart`);
  }

  /// 13. Acción de carrito (add, set-quantity, remove, repeat-order). Devuelve el carrito completo.
  accionCarrito(companyId: string, userId: string, accion: AccionCarrito, actor: Actor): Promise<Carrito> {
    return this.api.peticion('POST', `/companies/${segmento(companyId)}/users/${segmento(userId)}/cart/action`, {
      body: accion,
      actor,
      idempotente: ACCIONES_CARRITO_IDEMPOTENTES.has(accion.action),
    });
  }

  /// 14. Confirmar pedido [Idem]. Pasar la misma `idempotencyKey` si el usuario
  /// reintenta la misma confirmación (doble clic, red caída): no se duplica el pedido.
  confirmarPedido(companyId: string, datos: ConfirmarPedido, actor: Actor, idempotencyKey: string | true = true): Promise<PedidoConfirmado> {
    return this.api.peticion('POST', `/companies/${segmento(companyId)}/orders`, { body: datos, actor, idempotente: idempotencyKey });
  }

  /// 15. Pedidos de la empresa (paginado, máx. 100) con resumen por estado.
  pedidos(companyId: string, filtros: Paginacion & { estado?: string; q?: string } = {}): Promise<PedidosEmpresa> {
    return this.api.get(`/companies/${segmento(companyId)}/orders`, { ...filtros });
  }

  /// 16. Detalle de un pedido de la empresa.
  pedido(companyId: string, orderId: string): Promise<Pedido> {
    return this.api.get(`/companies/${segmento(companyId)}/orders/${segmento(orderId)}`);
  }
}
