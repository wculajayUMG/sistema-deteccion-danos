function integerFromEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue.trim() === '') {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsedValue;
}

function booleanFromEnv(name: string, fallback: boolean): boolean {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue.trim() === '') {
    return fallback;
  }

  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;

  throw new Error(`${name} must be either "true" or "false"`);
}

export default function configuration() {
  return {
    DATABASE_HOST: process.env.DATABASE_HOST ?? 'localhost',
    DATABASE_PORT: integerFromEnv('DATABASE_PORT', 5432),
    DATABASE_USER: process.env.DATABASE_USER ?? 'postgres',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
    DATABASE_NAME: process.env.DATABASE_NAME ?? 'seguros_elroble_ia',
    DATABASE_SYNC: booleanFromEnv('DATABASE_SYNC', false),
    DATABASE_LOGGING: booleanFromEnv('DATABASE_LOGGING', false),
    REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
    REDIS_PORT: integerFromEnv('REDIS_PORT', 6379),
    REDIS_TTL_SECONDS: integerFromEnv('REDIS_TTL_SECONDS', 3600),
    CF_R2_ACCOUNT_ID: process.env.CF_R2_ACCOUNT_ID,
    CF_R2_ACCESS_KEY_ID: process.env.CF_R2_ACCESS_KEY_ID,
    CF_R2_SECRET_ACCESS_KEY: process.env.CF_R2_SECRET_ACCESS_KEY,
    CF_R2_BUCKET_NAME: process.env.CF_R2_BUCKET_NAME,
    CF_R2_PUBLIC_URL: process.env.CF_R2_PUBLIC_URL,
    JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
    JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
    JWT_EXPIRATION: process.env.JWT_EXPIRATION ?? '8h',
    AI_SERVICE_URL: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  };
}
