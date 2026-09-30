import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/// Redis se usa SOLO como caché (resumen del carrito, estadísticas). La fuente
/// de verdad es PostgreSQL, así que un fallo de Redis nunca debe romper una
/// petición ni, sobre todo, dejar a medias un pedido ya confirmado: cada
/// operación degrada en silencio (con un aviso en el log) a "no hay caché".
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('redisUrl');
    /// Sin cola offline y con timeout corto: si Redis está caído la operación
    /// falla al instante en vez de quedarse esperando a que vuelva.
    this.client = new Redis(redisUrl!, { lazyConnect: false, enableOfflineQueue: false, commandTimeout: 1500 });
    this.client.on('error', (error: Error) => {
      this.logger.error(`Error de conexión a Redis: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.avisar('get', error);
      return null;
    }
  }

  async setEx(key: string, ttlSegundos: number, value: string): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttlSegundos);
    } catch (error) {
      this.avisar('set', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.avisar('del', error);
    }
  }

  private avisar(operacion: string, error: unknown): void {
    this.logger.warn(`Redis no disponible (${operacion}); se continúa sin caché: ${(error as Error).message}`);
  }
}
