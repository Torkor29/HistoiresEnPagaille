/**
 * Types communs pour les providers de génération d'images.
 * Permet de choisir : Gemini (Google), Replicate, ou Local (self-hosted).
 */

export type ImageProviderId = 'gemini' | 'replicate' | 'local';

export type ImageAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface GenerateImageParams {
  prompt: string;
  referenceImages?: Array<{ mimeType: string; base64: string }>;
  /** Pour cohérence de personnage (Replicate / Local). Ignoré si pas de référence. */
  mode: 'consistency' | 'fast';
  /** Ratio de l'image (par défaut 3:4 portrait). */
  aspectRatio?: ImageAspectRatio;
  requestId?: string;
}

export interface ImageProvider {
  id: ImageProviderId;
  /** Génère une image et retourne le buffer PNG. */
  generateImage(params: GenerateImageParams): Promise<Buffer>;
  /** Indique si le provider est configuré et utilisable. */
  isAvailable(): boolean;
}
