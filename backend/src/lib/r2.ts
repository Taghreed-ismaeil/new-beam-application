import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.r2.accessKeyId,
    secretAccessKey: env.r2.secretAccessKey,
  },
});

export async function uploadBuffer(key: string, body: Buffer, contentType: string): Promise<void> {
  await client.send(
    new PutObjectCommand({ Bucket: env.r2.bucket, Key: key, Body: body, ContentType: contentType }),
  );
}
