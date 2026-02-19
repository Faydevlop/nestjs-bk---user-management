import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

import { REDIS_CLIENT } from '../../utils/redis.constants';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: async (configService: ConfigService) => {
    const logger = new Logger('RedisModule');
    const redisUrl = configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined');
    }

    const client = new Redis(redisUrl, {
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 50, 500),
    });

    client.on('connect', () => logger.log('[Redis] Connected to Redis'));
    client.on('error', (err) => logger.error('[Redis] Redis Error', err));

    try {
      await client.connect();
    } catch (err) {
      logger.error('[Redis] Connection Failed', err);
    }

    return client;
  },
  inject: [ConfigService],
};
