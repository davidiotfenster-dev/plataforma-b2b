/// Prueba el contrato v1 de la API de Partners ruta a ruta (sección 13 del documento:
/// "probar cada contrato contra el Lambda MOCK antes de retirar Prisma por dominio").
///
///   npm run api:contrato                 → solo las lecturas (GET), seguro contra cualquier entorno
///   npm run api:contrato -- --escrituras → también las 22 escrituras (SOLO contra el MOCK)
///
/// Usa PARTNERS_API_URL y PARTNERS_API_KEY del .env y los ids de referencia del documento.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import configuration from '../src/config/configuration.js';
import { PartnersApiClient } from '../src/partners-api/partners-api.client.js';
import { PartnersApiAuthRepository } from '../src/partners-api/partners-api-auth.repository.js';
import { PartnersApiEmpresasRepository } from '../src/partners-api/partners-api-empresas.repository.js';
import { PartnersApiAdminRepository } from '../src/partners-api/partners-api-admin.repository.js';
import { PartnersApiAuditoriaRepository } from '../src/partners-api/partners-api-auditoria.repository.js';
import { PartnersApiError } from '../src/partners-api/partners-api.error.js';

Logger.overrideLogger(['error', 'warn']);
const escrituras = process.argv.includes('--escrituras');
const valores = configuration() as Record<string, unknown>;
const config = { get: (clave: string) => valores[clave] } as unknown as ConfigService;
const api = new PartnersApiClient(config);
if (!api.configurada) {
  console.error('Falta PARTNERS_API_URL en el .env');
  process.exit(1);
}

const auth = new PartnersApiAuthRepository(api);
const empresas = new PartnersApiEmpresasRepository(api);
const admin = new PartnersApiAdminRepository(api);
const auditoria = new PartnersApiAuditoriaRepository(api);

// Ids de referencia (sección 2 y 11 del documento).
const USER = 'user-001';
const COMPANY = 'company-001';
const ORDER = 'order-001';
const REP = '7d410000-0000-4000-8000-000000000001';
const PRODUCTO = '6a310000-0000-4000-8000-000000000001';
const MARCA = 'VBH';
const actor = { userId: USER, partnerId: COMPANY };
const actorAdmin = { userId: USER };

interface Caso {
  n: number;
  ruta: string;
  escritura?: boolean;
  llamar: () => Promise<unknown>;
  campos: string[];
}

const casos: Caso[] = [
  { n: 1, ruta: 'POST /auth/login-context', llamar: () => auth.contextoLogin('ana@empresa.es'), campos: ['userId', 'passwordHash', 'rol', 'activo', 'emailVerificado', 'partnerId', 'partnerEstado'] },
  { n: 2, ruta: 'GET /auth/session/{userId}?profile=true', llamar: () => auth.sesion(USER, true), campos: ['activo', 'rol', 'partnerId', 'partner', 'perfil'] },
  { n: 3, ruta: 'POST /auth/account-lookup', llamar: () => auth.buscarCuenta('ana@empresa.es'), campos: ['userId', 'email', 'idioma', 'activo'] },
  { n: 4, ruta: 'POST /auth/registrations', escritura: true, llamar: () => auth.registrar({ partnerId: randomUUID(), userId: randomUUID(), razonSocial: 'Empresa Demo SL', cif: 'B12345678', email: 'admin@empresa.es', passwordHash: '$2b$12$prueba', tokenVerificacion: 'prueba' }), campos: ['partnerId', 'userId', 'estado'] },
  { n: 5, ruta: 'POST /auth/email-verification', escritura: true, llamar: () => auth.verificarEmail(USER, 'prueba'), campos: ['verified', 'partner', 'emailsAdmins'] },
  { n: 6, ruta: 'POST /auth/password-reset', escritura: true, llamar: () => auth.restablecerPassword(USER, 'prueba', '$2b$12$prueba'), campos: ['updated', 'sessionsInvalidated'] },
  { n: 7, ruta: 'POST /auth/users/{userId}/account', escritura: true, llamar: () => auth.accionCuenta(USER, { action: 'set-language', idioma: 'DE' }, actor), campos: ['updated'] },
  { n: 8, ruta: 'GET /companies/{companyId}/catalog', llamar: () => empresas.catalogo(COMPANY), campos: ['items'] },
  { n: 9, ruta: 'GET /companies/{companyId}/catalog/{repId}', llamar: () => empresas.producto(COMPANY, REP), campos: ['id', 'skuComercial', 'nombreComercial', 'pvpBase', 'descuentoAplicado', 'precioNeto'] },
  { n: 10, ruta: 'GET /companies/{companyId}/users', llamar: () => empresas.usuarios(COMPANY), campos: ['items'] },
  { n: 11, ruta: 'POST /companies/{companyId}/users', escritura: true, llamar: () => empresas.crearUsuario(COMPANY, { userId: randomUUID(), email: 'nuevo@empresa.es', nombre: 'Juan', rol: 'PARTNER_COMPRADOR', tokenInvitacion: 'prueba' }, actor), campos: ['id', 'email', 'rol'] },
  { n: 12, ruta: 'GET /companies/{companyId}/users/{userId}/cart', llamar: () => empresas.carrito(COMPANY, USER), campos: ['id', 'items', 'totalNeto'] },
  { n: 13, ruta: 'POST /companies/{companyId}/users/{userId}/cart/action', escritura: true, llamar: () => empresas.accionCarrito(COMPANY, USER, { action: 'add', repId: REP, cantidad: 2 }, actor), campos: ['id', 'items', 'totalNeto'] },
  { n: 14, ruta: 'POST /companies/{companyId}/orders', escritura: true, llamar: () => empresas.confirmarPedido(COMPANY, { userId: USER, direccionEnvio: 'Calle Mayor 10, 28001 Madrid, España', poNumber: 'PO-2026-118', notas: null, totalEsperado: '1250.00' }, actor), campos: ['id', 'codigoPed', 'estado', 'totalNeto', 'lineas', 'usuario', 'emailsAdmins'] },
  { n: 15, ruta: 'GET /companies/{companyId}/orders', llamar: () => empresas.pedidos(COMPANY, { page: 1, limit: 20 }), campos: ['items', 'summary', 'total'] },
  { n: 16, ruta: 'GET /companies/{companyId}/orders/{orderId}', llamar: () => empresas.pedido(COMPANY, ORDER), campos: ['id', 'codigoPed', 'estado', 'lineas', 'historial'] },
  { n: 17, ruta: 'GET /admin/companies', llamar: () => admin.empresas({ page: 1, limit: 20 }), campos: ['items', 'total'] },
  { n: 18, ruta: 'POST /admin/companies', escritura: true, llamar: () => admin.crearEmpresa({ companyId: randomUUID(), userId: randomUUID(), razonSocial: 'Empresa Demo SL', cif: 'B12345678', tipo: 'PARTNER', marcaCatalogo: 'VBH', descuentoPorcentaje: '15.00' }, actorAdmin), campos: ['company', 'user', 'catalogSync'] },
  { n: 19, ruta: 'GET /admin/companies/{id}', llamar: () => admin.empresa(COMPANY), campos: ['id', 'razonSocial', 'estado', 'descuentoPorcentaje', 'updatedAt'] },
  { n: 20, ruta: 'PUT /admin/companies/{id}', escritura: true, llamar: () => admin.actualizarEmpresa(COMPANY, { razonSocial: 'Empresa Demo SL', descuentoPorcentaje: '20.00', expectedUpdatedAt: '2026-10-06T09:15:02.123Z' }, actorAdmin), campos: ['company', 'catalogSync'] },
  { n: 21, ruta: 'DELETE /admin/companies/{id}', escritura: true, llamar: () => admin.eliminarEmpresa(COMPANY, 'Empresa Demo SL', actorAdmin), campos: ['deleted'] },
  { n: 22, ruta: 'POST /admin/companies/{id}/transition', escritura: true, llamar: () => admin.transicionEmpresa(COMPANY, { action: 'approve', expectedState: 'PENDIENTE_APROBACION', data: { marcaCatalogo: 'VBH', descuentoPorcentaje: '15.00' } }, actorAdmin), campos: ['company', 'action'] },
  { n: 23, ruta: 'PATCH /admin/users/{userId}/access', escritura: true, llamar: () => admin.accesoUsuario(USER, { rol: 'PARTNER_ADMIN', activo: true }, actorAdmin), campos: ['id', 'rol', 'activo'] },
  { n: 24, ruta: 'GET /admin/users/{userId}/audit', llamar: () => admin.auditoriaUsuario(USER), campos: ['items'] },
  { n: 25, ruta: 'GET /admin/companies/{id}/catalog', llamar: () => admin.catalogoEmpresa(COMPANY), campos: ['companyId', 'items'] },
  { n: 26, ruta: 'POST /admin/companies/{id}/catalog/action', escritura: true, llamar: () => admin.accionCatalogoEmpresa(COMPANY, { action: 'assign', products: [{ productoBaseId: PRODUCTO, skuComercial: 'CUSTOM-001' }] }, actorAdmin), campos: ['success', 'catalog'] },
  { n: 27, ruta: 'GET /admin/products', llamar: () => admin.productos(), campos: ['items'] },
  { n: 28, ruta: 'POST /admin/products/action', escritura: true, llamar: () => admin.accionProducto({ action: 'create', productId: randomUUID(), data: { skuIndustrial: '410', nombreTecnico: 'Controller 410', pvpTarifa: '100.00' } }, actorAdmin), campos: ['success', 'product'] },
  { n: 29, ruta: 'GET /admin/products/{id}/companies', llamar: () => admin.empresasDeProducto(PRODUCTO), campos: ['productId', 'items'] },
  { n: 30, ruta: 'GET /admin/brands/{brand}/catalog', llamar: () => admin.catalogoMarca(MARCA), campos: ['brand', 'items'] },
  { n: 31, ruta: 'POST /admin/brands/{brand}/catalog/action', escritura: true, llamar: () => admin.accionCatalogoMarca(MARCA, { action: 'add', productoBaseId: PRODUCTO, skuComercial: 'WAVE-410', nombreComercial: 'Wave Controller' }, actorAdmin), campos: ['success', 'sync'] },
  { n: 32, ruta: 'POST /admin/brands/{brand}/jobs', escritura: true, llamar: () => admin.procesoMarca(MARCA, { action: 'apply-rate', simulate: true, data: { ratePercent: '5.00' } }, actorAdmin), campos: ['success', 'processed'] },
  { n: 33, ruta: 'GET /admin/orders', llamar: () => admin.pedidos({ page: 1, limit: 20 }), campos: ['items', 'total'] },
  { n: 34, ruta: 'GET /admin/orders/{orderId}', llamar: () => admin.pedido(ORDER), campos: ['id', 'codigoPed', 'estado', 'lineas'] },
  { n: 35, ruta: 'POST /admin/orders/{orderId}/transition', escritura: true, llamar: () => admin.transicionPedido(ORDER, { expectedState: 'PREPARADO', newState: 'ENVIADO', force: false, shipping: { transportista: 'SEUR', numeroExpedicion: '123456', trackingUrl: 'https://www.seur.com/miseur' } }, actorAdmin), campos: ['order'] },
  { n: 36, ruta: 'GET /admin/stats', llamar: () => admin.estadisticas(), campos: ['kpis', 'series', 'byStatus', 'byCompany', 'byProduct'] },
  { n: 37, ruta: 'GET /admin/stats/export', llamar: () => admin.exportacionEstadisticas(), campos: ['rankings', 'orders'] },
  { n: 38, ruta: 'POST /audit/events', escritura: true, llamar: () => auditoria.enviarEventos([{ eventId: randomUUID(), timestamp: new Date().toISOString(), eventType: 'PRUEBA_CONTRATO', level: 'INFO', userId: USER, partnerId: COMPANY, requestId: randomUUID(), endpoint: '/auth/login', method: 'POST', statusCode: 200 }]), campos: ['accepted', 'duplicates'] },
];

let fallos = 0;
let saltadas = 0;
console.log(`API: ${String(valores.partnersApiUrl)}${escrituras ? '  (con escrituras)' : '  (solo lecturas)'}\n`);
for (const caso of casos) {
  const nombre = `${String(caso.n).padStart(2)}. ${caso.ruta}`;
  if (caso.escritura && !escrituras) {
    saltadas++;
    console.log(`  -  ${nombre}  (escritura: añada --escrituras)`);
    continue;
  }
  const inicio = Date.now();
  try {
    const respuesta = (await caso.llamar()) as Record<string, unknown>;
    const faltan = caso.campos.filter((campo) => respuesta?.[campo] === undefined);
    if (faltan.length) {
      fallos++;
      console.log(`  ✗  ${nombre}  faltan: ${faltan.join(', ')}`);
    } else {
      console.log(`  ✓  ${nombre}  ${Date.now() - inicio} ms`);
    }
  } catch (error) {
    fallos++;
    const detalle = error instanceof PartnersApiError ? `${error.estadoRemoto} ${error.codigo}` : (error as Error).message;
    console.log(`  ✗  ${nombre}  ${detalle}`);
  }
}
console.log(`\n${casos.length - fallos - saltadas} correctas, ${fallos} con fallos, ${saltadas} sin probar.`);
process.exit(fallos ? 1 : 0);
