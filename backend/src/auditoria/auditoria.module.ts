import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaInterceptor } from '../common/interceptors/auditoria.interceptor.js';
import { AuditoriaFilter } from '../common/filters/auditoria.filter.js';
import { AuditoriaService } from './auditoria.service.js';

@Module({
  providers: [
    AuditoriaService,
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
    { provide: APP_FILTER, useClass: AuditoriaFilter },
  ],
})
export class AuditoriaModule {}
