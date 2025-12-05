import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheManagerStore } from 'cache-manager';
import { createClient } from 'redis';
import { CacheService } from './cache.service';

const buildRedisStore = async (): Promise<CacheManagerStore> => {
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    },
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
  });

  client.on('error', (err) => console.error('Redis Client Error', err));

  await client.connect();
  await client.ping();
  console.log('Redis cache connected');

  const serialize = (value: unknown) =>
    typeof value === 'string' ? value : JSON.stringify(value);
  const deserialize = (value: string | null) => value;

  const store: CacheManagerStore = {
    name: 'redis',
    get: async (key: string) => deserialize(await client.get(key)),
    mget: async (...keys: string[]) => {
      const values = await Promise.all(keys.map((key) => client.get(key)));
      return values.map((value) => deserialize(value));
    },
    set: async (key: string, value: unknown, ttl?: number) => {
      const payload = serialize(value);
      if (ttl && ttl > 0) {
        await client.set(key, payload, { PX: ttl });
      } else {
        await client.set(key, payload);
      }
    },
    mset: async (data: Record<string, unknown>, ttl?: number) => {
      await Promise.all(
        Object.entries(data).map(([key, value]) =>
          ttl && ttl > 0
            ? client.set(key, serialize(value), { PX: ttl })
            : client.set(key, serialize(value)),
        ),
      );
    },
    del: async (key: string) => {
      await client.del(key);
    },
    mdel: async (...keys: string[]) => {
      if (keys.length) {
        await client.del(keys);
      }
    },
    ttl: async (key: string, ttl?: number) => {
      if (ttl && ttl > 0) {
        await client.pExpire(key, ttl);
      }
      return await client.pTTL(key);
    },
    keys: async () => client.keys('*'),
    reset: async () => {
      await client.flushDb();
    },
    disconnect: async () => {
      await client.disconnect();
    },
  };

  return store;
};

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => {
        return {
          stores: [await buildRedisStore()],
          ttl: 60000, // default TTL in milliseconds (60s)
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class RedisCacheModule {}
