import Redis from 'ioredis';
import { DataSource } from 'typeorm';

const postgres = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres_password',
  database: process.env.DB_NAME ?? 'elroble_db',
  entities: [],
  synchronize: false,
  connectTimeoutMS: 5000,
});

const redis = new Redis({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  connectTimeout: 5000,
  maxRetriesPerRequest: 0,
  lazyConnect: true,
});

let failed = false;

try {
  await postgres.initialize();
  await postgres.query('SELECT 1');
  console.log('PostgreSQL connection: OK');
} catch (error) {
  failed = true;
  console.error('PostgreSQL connection: FAILED', error);
}

try {
  await redis.connect();
  const response = await redis.ping();
  if (response !== 'PONG') {
    throw new Error(`Unexpected Redis response: ${response}`);
  }
  console.log('Redis connection: OK');
} catch (error) {
  failed = true;
  console.error('Redis connection: FAILED', error);
} finally {
  if (postgres.isInitialized) {
    await postgres.destroy();
  }
  if (redis.status !== 'end') {
    await redis.quit();
  }
}

if (failed) {
  process.exitCode = 1;
}
