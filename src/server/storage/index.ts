import type { StorageProvider } from './types';
import { createLocalStorage } from './local';

let instance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!instance) {
    const provider = process.env.STORAGE_PROVIDER || 'local';
    if (provider === 's3') {
      try {
        const { createS3Storage } = require('./s3');
        instance = createS3Storage();
      } catch {
        instance = createLocalStorage();
      }
    } else {
      instance = createLocalStorage();
    }
  }
  return instance as StorageProvider;
}

export type { StorageProvider } from './types';
export { createLocalStorage, readLocalFile } from './local';
