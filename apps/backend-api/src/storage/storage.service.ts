import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private client: S3Client | undefined;
  private bucket: string | undefined;

  constructor(private readonly config: ConfigService) {}

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    if (buffer.length === 0) {
      throw new Error('Cannot upload an empty file');
    }
    if (!contentType.trim()) {
      throw new Error('A content type is required to upload a file');
    }
    this.assertSafeKey(key);

    const { client, bucket } = this.getConfiguration();
    const publicUrl = this.getPublicUrl();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `${publicUrl.replace(/\/+$/, '')}/${encodedKey}`;
  }

  async deleteFile(key: string): Promise<void> {
    this.assertSafeKey(key);
    const { client, bucket } = this.getConfiguration();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  generateKey(idSiniestro: number, filename: string): string {
    if (!Number.isInteger(idSiniestro) || idSiniestro < 1) {
      throw new Error('A positive claim ID is required to generate a storage key');
    }
    const safeFilename = filename
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!safeFilename) {
      throw new Error('A valid filename is required to generate a storage key');
    }
    return `siniestros/${idSiniestro}/${Date.now()}-${safeFilename}`;
  }

  private getConfiguration(): { client: S3Client; bucket: string } {
    if (this.client && this.bucket) {
      return { client: this.client, bucket: this.bucket };
    }

    const accountId = this.config.get<string>('CF_R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('CF_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('CF_R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('CF_R2_BUCKET_NAME');
    const requiredValues = {
      CF_R2_ACCOUNT_ID: accountId,
      CF_R2_ACCESS_KEY_ID: accessKeyId,
      CF_R2_SECRET_ACCESS_KEY: secretAccessKey,
      CF_R2_BUCKET_NAME: bucket,
    };
    const missingValues = Object.entries(requiredValues)
      .filter(
        ([, value]) =>
          !value?.trim() ||
          value.startsWith('your_') ||
          value.includes('xxxxx'),
      )
      .map(([name]) => name);
    if (missingValues.length > 0) {
      throw new Error(
        `Cloudflare R2 is not configured. Set valid values for: ${missingValues.join(', ')}`,
      );
    }

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('Cloudflare R2 configuration is incomplete');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = bucket;

    return { client: this.client, bucket };
  }

  private getPublicUrl(): string {
    const publicUrl = this.config.get<string>('CF_R2_PUBLIC_URL');
    if (
      !publicUrl?.trim() ||
      publicUrl.startsWith('your_') ||
      publicUrl.includes('xxxxx')
    ) {
      throw new Error(
        'Cloudflare R2 upload requires a valid CF_R2_PUBLIC_URL value',
      );
    }
    return publicUrl;
  }

  private assertSafeKey(key: string): void {
    if (
      !key.trim() ||
      key.startsWith('/') ||
      key.includes('\\') ||
      key.split('/').some((segment) => segment === '.' || segment === '..') ||
      [...key].some((character) => character.charCodeAt(0) <= 0x1f)
    ) {
      throw new Error('The storage key is invalid');
    }
  }
}
