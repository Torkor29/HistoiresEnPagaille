/**
 * ModelResolver — IDs des modèles Gemini (évolutifs).
 * Par défaut : Gemini 3 (meilleur raisonnement + images). Override via .env si besoin.
 * - TEXTE : synopsis, histoire, 4e de couv., plan de pages, description personnage.
 * - IMAGE : illustrations (consistency = avec refs personnage, fast = sans refs).
 */

export const MODEL_IDS = {
  /** Modèle pour tout le texte du livre. */
  text: process.env.GEMINI_MODEL_TEXT || 'gemini-3.1-pro-preview',
  /** Modèle pour les illustrations (mode cohérence : avec refs personnage). */
  imageConsistency: process.env.GEMINI_MODEL_IMAGE_CONSISTENCY || 'gemini-3.1-flash-image-preview',
  /** Modèle pour les illustrations (mode rapide : sans refs). */
  imageFast: process.env.GEMINI_MODEL_IMAGE_FAST || 'gemini-3.1-flash-image-preview',
} as const;

export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];
