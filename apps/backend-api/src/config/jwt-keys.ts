import { ConfigService } from '@nestjs/config';

export function getRsaKey(config: ConfigService, name: string): string {
  const key = config.get<string>(name)?.replace(/\\n/g, '\n');
  if (!key?.includes('-----BEGIN ') || !key.includes('-----END ')) {
    throw new Error(`${name} must contain a PEM-encoded RSA key`);
  }
  return key;
}
