/**
 * Service Gemini — Génération d'images via generateContent (Gemini multimodal).
 * Consistency : prompt + images de référence. Fast : prompt seul.
 * (Imagen / generateImages n'est pas utilisé : 404 avec clé Google AI Studio.)
 */

import { createHash } from 'crypto';
import { gemini, getImageModel, isGeminiAvailable } from './gemini-client';
import { SAFETY_CONFIG } from './gemini-text';
import { logger } from '@/lib/logger';

const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 2;
const FIX_ATTEMPT_ONCE = true;

function hashPrompt(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

type ImagePart = { inlineData?: { mimeType: string; data: string } };

function extractImageFromGenerateContent(response: unknown): Buffer | null {
  const r = response as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> };
    }>;
    generatedImages?: Array<{ image?: { imageBytes?: string } }>;
  };
  // Réponse standard generateContent (image dans parts)
  const parts = r?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }
  // Fallback : certains modèles image renvoient generatedImages
  const imgBytes = r?.generatedImages?.[0]?.image?.imageBytes;
  if (imgBytes) return Buffer.from(imgBytes, 'base64');
  return null;
}

/**
 * Génère une image à partir d'un prompt texte.
 * referenceImages : pour mode consistency (Gemini multimodal).
 */
export type GeminiAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export async function generateImage(params: {
  prompt: string;
  referenceImages?: Array<{ mimeType: string; base64: string }>;
  mode: 'consistency' | 'fast';
  aspectRatio?: GeminiAspectRatio;
  requestId?: string;
  fixFace?: boolean;
}): Promise<Buffer> {
  const { prompt, referenceImages = [], mode, aspectRatio = '3:4', requestId, fixFace } = params;
  if (!isGeminiAvailable()) throw new Error('Gemini API non configurée');
  const model = getImageModel(mode);
  const promptHash = hashPrompt(prompt);
  logger.info({ requestId, promptHash, model }, 'generateImage start');

  let lastError: Error | null = null;

  // Les deux modes utilisent generateContent (Gemini multimodal). Pas d'Imagen (generateImages) pour éviter 404 avec clé AI Studio.
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (mode === 'consistency' && referenceImages.length > 0) {
    for (const ref of referenceImages) {
      parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } });
    }
  }
  parts.push({ text: prompt });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          ...SAFETY_CONFIG,
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio },
        },
      });
      const buffer = extractImageFromGenerateContent(response);
      if (buffer && buffer.length > 0) {
        logger.info({ requestId, promptHash }, 'generateImage success');
        return buffer;
      }
      const anyRes = response as { candidates?: Array<{ content?: { parts?: ImagePart[] } }> };
      for (const c of anyRes.candidates ?? []) {
        for (const p of c.content?.parts ?? []) {
          if (p.inlineData?.data) {
            const buf = Buffer.from(p.inlineData.data, 'base64');
            if (buf.length > 0) return buf;
          }
        }
      }
      lastError = new Error(
        'La génération d\'image n\'a pas renvoyé de résultat. Le modèle utilisé ne produit peut-être pas d\'images. Vous pouvez consulter votre histoire sans les illustrations.'
      );
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logger.warn({ requestId, attempt, err: lastError.message }, 'generateImage retry');
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  if (FIX_ATTEMPT_ONCE && !fixFace) {
    logger.info({ requestId }, 'generateImage attempt fix face');
    try {
      const fixPrompt = `Même illustration mais avec un visage d'enfant harmonieux et proportionné, expression douce. ${prompt}`;
      return await generateImage({
        ...params,
        prompt: fixPrompt,
        fixFace: true,
      });
    } catch {
      // ignore
    }
  }

  throw (
    lastError ??
    new Error(
      'La génération d\'image a échoué. Vous pouvez tout de même consulter votre histoire (synopsis et texte) depuis le projet.'
    )
  );
}
