import { Module, Global } from '@nestjs/common';
import { redisProvider } from '../services/redis/redis.provider';

@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule {}
