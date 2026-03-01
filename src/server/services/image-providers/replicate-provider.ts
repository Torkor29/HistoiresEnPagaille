/**
 * Provider Replicate — Modèle "consistent-character" pour cohérence de personnage.
 * Nécessite REPLICATE_API_TOKEN. Crédits gratuits à l'inscription, puis payant par run.
 */

import type { ImageProvider, GenerateImageParams } from './types';
import { logger } from '@/lib/logger';

const MODEL_OWNER = 'sdxl-based';
const MODEL_NAME = 'consistent-character';
const MODEL_REF = `${MODEL_OWNER}/${MODEL_NAME}`;

async function getLatestVersion(replicate: any): Promise<string> {
  const list = await replicate.models.versions.list(MODEL_OWNER, MODEL_NAME);
  const versionId = list?.results?.[0]?.id;
  if (!versionId) throw new Error('Impossible de récupérer la version du modèle Replicate');
  return versionId;
}

function isAvailable(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}

async function generateImage(params: GenerateImageParams): Promise<Buffer> {
  const { prompt, referenceImages, requestId } = params;
  if (!isAvailable()) {
    throw new Error('Replicate n\'est pas configuré : définissez REPLICATE_API_TOKEN dans .env');
  }

  let imageInput: string | undefined;
  if (referenceImages && referenceImages.length > 0) {
    const ref = referenceImages[0];
    imageInput = `data:${ref.mimeType};base64,${ref.base64}`;
  }

  try {
    const Replicate = (await import('replicate')).default;
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const input = { prompt, image: imageInput ?? undefined, num_outputs: 1 } as Record<string, unknown>;
    let output: unknown;
    try {
      output = await replicate.run(MODEL_REF as `${string}/${string}`, { input });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('404') || msg.includes('not found')) {
        const version = await getLatestVersion(replicate);
        output = await replicate.run(`${MODEL_REF}:${version}` as `${string}/${string}`, { input });
      } else {
        throw err;
      }
    }

    const url = Array.isArray(output) ? output[0] : output;
    if (typeof url !== 'string' || !url.startsWith('http')) {
      logger.warn({ requestId, output }, 'Replicate output format inattendu');
      throw new Error('Replicate n\'a pas renvoyé d\'image valide');
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Échec téléchargement image Replicate: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn({ requestId, err: msg }, 'Replicate generateImage error');
    throw new Error(`Replicate : ${msg}`);
  }
}

export const replicateProvider: ImageProvider = {
  id: 'replicate',
  isAvailable,
  generateImage,
};
