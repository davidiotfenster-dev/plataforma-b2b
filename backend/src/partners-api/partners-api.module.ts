import { Global, Module } from '@nestjs/common';
import { PartnersApiClient } from './partners-api.client.js';
import { PartnersApiAuthRepository } from './partners-api-auth.repository.js';
import { PartnersApiEmpresasRepository } from './partners-api-empresas.repository.js';
import { PartnersApiAdminRepository } from './partners-api-admin.repository.js';
import { PartnersApiAuditoriaRepository } from './partners-api-auditoria.repository.js';
import { AuditoriaRemotaService } from './auditoria-remota.service.js';

const PROVEEDORES = [
  PartnersApiClient,
  PartnersApiAuthRepository,
  PartnersApiEmpresasRepository,
  PartnersApiAdminRepository,
  PartnersApiAuditoriaRepository,
  AuditoriaRemotaService,
];

/// Acceso a la API de Partners de IoT FENSTER (AWS API Gateway /v1). Global para que
/// cada dominio (auth, catálogo, carrito, pedidos, admin) pueda ir pasando de Prisma
/// a la API sin cambiar sus controladores ni lo que recibe el frontend.
@Global()
@Module({
  providers: PROVEEDORES,
  exports: PROVEEDORES,
})
export class PartnersApiModule {}
