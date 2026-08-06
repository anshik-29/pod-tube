import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider } from './types';
import Readable from 'stream';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicDomain: string | null;

  constructor() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
    this.bucket = process.env.R2_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'riverside-clone';
    this.publicDomain = process.env.R2_PUBLIC_DOMAIN || null;

    let endpoint = process.env.R2_ENDPOINT_URL;
    if (!endpoint && accountId) {
      endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    }

    if (!endpoint) {
      console.warn('[Cloudflare R2] Warning: R2_ENDPOINT_URL or CLOUDFLARE_ACCOUNT_ID missing in environment variables.');
    }

    this.client = new S3Client({
      region: 'auto', // Cloudflare R2 uses 'auto' region
      endpoint: endpoint || 'https://auto.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async save(path: string, data: Buffer | NodeJS.ReadableStream): Promise<void> {
    let body: Buffer;
    if (Buffer.isBuffer(data)) {
      body = data;
    } else {
      const chunks: Uint8Array[] = [];
      for await (const chunk of data) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      body = Buffer.concat(chunks);
    }

    const contentType = path.endsWith('.mp4')
      ? 'video/mp4'
      : path.endsWith('.webm')
      ? 'video/webm'
      : path.endsWith('.wav')
      ? 'audio/wav'
      : path.endsWith('.mp3')
      ? 'audio/mpeg'
      : 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
    console.log(`[Cloudflare R2] Successfully uploaded object: ${path}`);
  }

  async read(path: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Object body empty for ${path}`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async exists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async delete(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });
    await this.client.send(command);
  }

  async getStream(path: string): Promise<NodeJS.ReadableStream> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });
    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Object body empty for ${path}`);
    }
    const stream = response.Body as unknown as NodeJS.ReadableStream;
    return stream;
  }

  async getUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    if (this.publicDomain) {
      const cleanDomain = this.publicDomain.replace(/\/$/, '');
      return `${cleanDomain}/${path}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Helper method for generating direct client-to-R2 upload presigned URLs
   */
  async getPresignedUploadUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
