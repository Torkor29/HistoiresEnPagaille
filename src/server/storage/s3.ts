/**
 * Abstraction S3/R2 pour la prod.
 * Dépendances optionnelles : @aws-sdk/client-s3 (à ajouter si utilisation).
 */

import type { StorageProvider } from './types';

export function createS3Storage(): StorageProvider {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const endpoint = process.env.S3_ENDPOINT;
  if (!bucket) throw new Error('S3_BUCKET is required for S3 storage');

  // Pour MVP, on retourne une implémentation "stub" qui échoue proprement
  // En prod, utiliser @aws-sdk/client-s3 et signer les URLs (getSignedUrl).
  return {
    async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
      // TODO: S3 PutObject avec ACL private, retourner key
      throw new Error(
        'S3 storage not implemented in this build. Set STORAGE_PROVIDER=local or implement S3 PutObject.'
      );
    },
    async getUrl(key: string): Promise<string> {
      // TODO: getSignedUrl pour téléchargement
      return `https://${bucket}.s3.${region || 'us-east-1'}.amazonaws.com/${key}`;
    },
  };
}
