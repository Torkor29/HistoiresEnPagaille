/**
 * ModelResolver — IDs des modèles Gemini (évolutifs).
 * Pour un même livre on utilise :
 * - Un modèle TEXTE pour tout le texte : synopsis, histoire, 4e de couverture, plan de mise en page, description du personnage (cohérence).
 * - Un ou deux modèles IMAGE pour toutes les illustrations (consistency vs fast). Override possible via .env.
 * Ne pas exposer au client.
 */

export const MODEL_IDS = {
  /** Modèle pour tout le texte du livre : synopsis, story, back cover, layout, character descriptor. */
  text: process.env.GEMINI_MODEL_TEXT || 'gemini-2.0-flash',
  /** Modèle pour les illustrations (mode cohérence : avec refs personnage). */
  imageConsistency: process.env.GEMINI_MODEL_IMAGE_CONSISTENCY || 'gemini-2.5-flash-image',
  /** Modèle pour les illustrations (mode rapide : sans refs). */
  imageFast: process.env.GEMINI_MODEL_IMAGE_FAST || 'gemini-2.5-flash-image',
} as const;

export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];
