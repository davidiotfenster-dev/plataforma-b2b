import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaInterceptor } from '../common/interceptors/auditoria.interceptor.js';

@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor }],
})
export class AuditoriaModule {}
