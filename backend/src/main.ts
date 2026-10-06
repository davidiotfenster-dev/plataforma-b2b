import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { validarEntorno } from './config/validar-entorno.js';

async function bootstrap() {
  const logger = new Logger('Arranque');
  const { errores, avisos } = validarEntorno();
  avisos.forEach((aviso) => logger.warn(aviso));
  if (errores.length > 0) {
    errores.forEach((error) => logger.error(error));
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /// Detrás de Nginx, Cloudflare o un balanceador, `TRUST_PROXY` es el número de
  /// proxies: sin él todas las peticiones llegan con la IP del proxy, el límite de
  /// intentos de login lo comparten todos los clientes y la auditoría guarda
  /// siempre la misma IP. Sin proxy delante se deja sin definir (si no, cualquiera
  /// podría falsear su IP con la cabecera X-Forwarded-For).
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY));
  }

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
