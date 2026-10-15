import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

// R2_ACCOUNT_ID=local keeps every write on local disk (served by index.ts) so a dev/test
// backend can never overwrite the real bucket's objects — several keys are deterministic
// (images/<itemId>/color.png, menu-cards/<itemId>.png), so a stray write would clobber prod.
export const useLocalStorage = env.r2.accountId === 'local';
export const LOCAL_STORAGE_DIR = path.resolve(__dirname, '../../public/local-storage');

const client = useLocalStorage
  ? null
  : new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
      },
    });

export async function uploadBuffer(key: string, body: Buffer, contentType: string): Promise<void> {
  if (!client) {
    const target = path.join(LOCAL_STORAGE_DIR, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    return;
  }
  await client.send(
    new PutObjectCommand({ Bucket: env.r2.bucket, Key: key, Body: body, ContentType: contentType }),
  );
}
