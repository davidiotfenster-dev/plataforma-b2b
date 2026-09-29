import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('redisUrl');
    this.client = new Redis(redisUrl!, { lazyConnect: false });
    this.client.on('error', (error: Error) => {
      this.logger.error(`Error de conexión a Redis: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setEx(key: string, ttlSegundos: number, value: string): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSegundos);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
