import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration from './config/configuration.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { PdfModule } from './common/pdf/pdf.module.js';
import { EmailModule } from './common/email/email.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PartnersModule } from './partners/partners.module.js';
import { CatalogoMarcaModule } from './catalogo-marca/catalogo-marca.module.js';
import { ImagenesModule } from './imagenes/imagenes.module.js';
import { ProductosModule } from './productos/productos.module.js';
import { CarritoModule } from './carrito/carrito.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 20 }],
    }),
    PrismaModule,
    RedisModule,
    PdfModule,
    EmailModule,
    AuthModule,
    UsersModule,
    PartnersModule,
    ProductosModule,
    ImagenesModule,
    CatalogoMarcaModule,
    CarritoModule,
    PedidosModule,
    AuditoriaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
