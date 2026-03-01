import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import type { StorageProvider } from './types';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export function createLocalStorage(): StorageProvider {
  return {
    async upload(
      key: string,
      buffer: Buffer,
      _mimeType: string
    ): Promise<string> {
      const fullPath = join(UPLOAD_DIR, key);
      await mkdir(join(UPLOAD_DIR, key.split('/').slice(0, -1).join('/')), {
        recursive: true,
      });
      await writeFile(fullPath, buffer);
      return key;
    },

    async getUrl(key: string): Promise<string> {
      return `/api/files/${encodeURIComponent(key)}`;
    },
  };
}

export async function readLocalFile(key: string): Promise<Buffer> {
  const fullPath = join(UPLOAD_DIR, key);
  return readFile(fullPath);
}
