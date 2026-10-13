import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import Keyv from 'keyv';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.getOrThrow<string>('REDIS_HOST');
        const port = config.getOrThrow<number>('REDIS_PORT');
        const ttlSeconds = config.getOrThrow<number>('REDIS_TTL_SECONDS');
        const redisStore = new KeyvRedis(`redis://${host}:${port}`);
        const store = new Keyv({
          store: redisStore,
          namespace: 'seguros-elroble',
          ttl: ttlSeconds * 1000,
        });
        store.on('error', (error: Error) => {
          console.error('Redis cache store error', error);
        });

        return { stores: [store], ttl: ttlSeconds * 1000 };
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
