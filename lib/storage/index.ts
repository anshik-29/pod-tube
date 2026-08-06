import type { StorageProvider } from './types';
import { LocalStorageProvider } from './local';
import { S3StorageProvider } from './s3';

let storageProvider: StorageProvider | null = null;
let lastStorageType: string | null = null;

export function getStorageProvider(): StorageProvider {
  // Always normalize the storage type
  const rawStorageType = process.env.STORAGE_TYPE || 'local';
  const storageType = rawStorageType.toLowerCase();
  
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && storageType !== 'r2' && storageType !== 's3') {
    throw new Error(
      `[Storage Error] INVALID CONFIGURATION FOR PRODUCTION: STORAGE_TYPE is set to "${rawStorageType}". Production deployments on ephemeral platforms like Railway require persistent cloud storage ("r2" or "s3"). Please set STORAGE_TYPE=r2 in your environment variables.`
    );
  }

  // Re-initialize if storage type changed or provider doesn't exist
  if (!storageProvider || lastStorageType !== storageType) {
    const storageDir = process.env.STORAGE_LOCAL_DIR || './uploads';

    if (storageType === 'local') {
      storageProvider = new LocalStorageProvider(storageDir);
      lastStorageType = storageType;
    } else if (storageType === 'r2' || storageType === 's3') {
      storageProvider = new S3StorageProvider();
      lastStorageType = storageType;
    } else {
      throw new Error(`Unsupported storage type: "${rawStorageType}" (normalized: "${storageType}"). Supported types: "local", "r2", "s3"`);
    }
  }

  return storageProvider;
}

export type { StorageProvider } from './types';
