/**
 * Client Gemini côté serveur uniquement.
 * La clé API ne doit jamais être exposée au client.
 */

import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';
import { MODEL_IDS } from '@/server/config/models';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey && process.env.NODE_ENV === 'production') {
  logger.warn('GEMINI_API_KEY is not set');
}

export const gemini = apiKey
  ? new GoogleGenAI({ apiKey })
  : (null as unknown as GoogleGenAI);

export function getTextModel() {
  return MODEL_IDS.text;
}

export function getImageModel(mode: 'consistency' | 'fast') {
  return mode === 'consistency' ? MODEL_IDS.imageConsistency : MODEL_IDS.imageFast;
}

export function isGeminiAvailable(): boolean {
  return !!apiKey && !!gemini;
}

/** Message utilisateur si l'erreur vient d'une clé API Gemini invalide ou désactivée. */
export function getGeminiUserMessage(err: unknown): string | null {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('api key') ||
    msg.includes('apikey') ||
    msg.includes('invalid_api_key') ||
    msg.includes('invalid_argument') ||
    msg.includes('permission') ||
    msg.includes('quota') ||
    msg.includes('not valid')
  ) {
    return 'Clé API Gemini invalide ou désactivée. Vérifiez GEMINI_API_KEY dans .env et que l’API Generative Language est activée sur [Google AI Studio](https://aistudio.google.com/apikey).';
  }
  return null;
}
