/**
 * Provider Local — Appel à votre propre serveur (ex. ComfyUI, SD + IP-Adapter).
 * Définir LOCAL_IMAGE_API_URL dans .env (ex. http://localhost:8188/generate).
 *
 * Contrat attendu :
 * - POST JSON : { "prompt": string, "referenceImageBase64"?: string, "referenceImageMime"?: string }
 * - Réponse : body binaire image/png OU JSON { "imageBase64": string }
 */

import type { ImageProvider, GenerateImageParams } from './types';
import { logger } from '@/lib/logger';

function getLocalUrl(): string {
  const url = process.env.LOCAL_IMAGE_API_URL;
  return url?.trim() || '';
}

function isAvailable(): boolean {
  return !!getLocalUrl();
}

async function generateImage(params: GenerateImageParams): Promise<Buffer> {
  const url = getLocalUrl();
  if (!url) {
    throw new Error(
      'Serveur local non configuré : définissez LOCAL_IMAGE_API_URL dans .env (ex. http://localhost:8188/generate)'
    );
  }

  const { prompt, referenceImages, requestId } = params;
  const body: Record<string, string> = { prompt };
  if (referenceImages && referenceImages.length > 0) {
    body.referenceImageBase64 = referenceImages[0].base64;
    body.referenceImageMime = referenceImages[0].mimeType;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Serveur local ${res.status}: ${text.slice(0, 200)}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as { imageBase64?: string };
      if (!data.imageBase64) throw new Error('Réponse JSON sans imageBase64');
      return Buffer.from(data.imageBase64, 'base64');
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn({ requestId, url, err: msg }, 'Local provider generateImage error');
    throw new Error(`Serveur local : ${msg}`);
  }
}

export const localProvider: ImageProvider = {
  id: 'local',
  isAvailable,
  generateImage,
};
