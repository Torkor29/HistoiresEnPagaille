/**
 * Service Gemini — Génération de texte (synopsis, histoire, 4e de couverture, layout).
 * Retry avec backoff, timeout, log du promptHash (sans données sensibles).
 */

import { createHash } from 'crypto';
import { gemini, getTextModel, isGeminiAvailable } from './gemini-client';
import { logger } from '@/lib/logger';
import type { SynopsisOutput } from '@/lib/schemas';
import { synopsisOutputSchema, storyOutputSchema, bookLayoutPlanSchema } from '@/lib/schemas';

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 1000;

/** Réduit les blocages abusifs pour contenus jeunesse : on ne bloque qu’au seuil HIGH. */
/** Désactiver avec GEMINI_USE_RELAXED_SAFETY=false pour revenir au défaut API (utile si blocages inexpliqués). */
const USE_RELAXED_SAFETY = process.env.GEMINI_USE_RELAXED_SAFETY !== 'false';
export const SAFETY_CONFIG = USE_RELAXED_SAFETY
  ? {
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }
  : undefined;

function hashPrompt(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/** Extrait le texte de la réponse Gemini ; si vide, renvoie la raison (blocage sécurité, etc.) pour un message d'erreur clair. */
function extractTextOrThrow(response: unknown, context: string): string {
  const r = response as {
    text?: string;
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };
  let text = r?.text ?? '';
  if (!text && r?.candidates?.[0]) {
    const parts = r.candidates[0].content?.parts ?? [];
    text = parts.map((p) => p.text ?? '').join('');
  }
  if (text && text.trim()) return text.trim();

  const finishReason = r?.candidates?.[0]?.finishReason ?? '';
  const blockReason = r?.promptFeedback?.blockReason ?? '';
  if (finishReason === 'SAFETY' || blockReason) {
    const reason = blockReason || finishReason;
    throw new Error(
      `Réponse Gemini bloquée (filtre de sécurité ou contenu refusé). Réessayez ou simplifiez un peu le thème. Détail : ${reason}`
    );
  }
  if (finishReason === 'MAX_TOKENS') {
    throw new Error('Réponse Gemini tronquée (limite de tokens). Réessayez avec une histoire plus courte.');
  }
  throw new Error(
    `Réponse Gemini vide (${context}). Vérifiez GEMINI_API_KEY et que le modèle est disponible sur Google AI Studio. Réessayez dans quelques instants si le problème persiste.`
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  requestId?: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const result = await fn();
      clearTimeout(timeout);
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logger.warn({ requestId, attempt, err: lastError.message }, 'Gemini text retry');
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

const PREMADE_SYNOPSIS_SYSTEM = `Tu es un "StoryPlanner" expert en histoires pour enfants. Tu produis UNIQUEMENT du JSON valide, sans texte avant ou après.
Règles : pas de violence, ton bienveillant, adapté à la jeunesse.
Format de réponse : { title, childCharacterName, moral (optionnel), chapters: [{ title, scenes: [{ title, summary }] }], safetyChecklist (optionnel) }.`;

const STORY_ARC_TYPES = [
  'quête / mission (le héros doit trouver ou récupérer quelque chose)',
  'sauvetage (le héros doit aider ou sauver quelqu\'un)',
  'mystère / enquête (le héros doit résoudre une énigme)',
  'voyage / exploration (le héros découvre un monde inconnu)',
  'compétition / défi (le héros doit se dépasser ou gagner un concours)',
  'transformation / apprentissage (le héros apprend quelque chose sur lui-même)',
  'amitié improbable (le héros se lie d\'amitié avec un être inattendu)',
  'invention / création (le héros construit ou invente quelque chose)',
  'malentendu comique (une erreur crée une série de situations drôles)',
  'retour impossible (le héros doit trouver son chemin dans un endroit inconnu)',
];

const TONE_VARIANTS = [
  'drôle et léger, avec des situations comiques',
  'tendre et émouvant, avec des moments touchants',
  'mystérieux et haletant, avec du suspense',
  'joyeux et festif, avec de l\'énergie',
  'poétique et onirique, avec des images de rêve',
  'espiègle et malicieux, avec un héros futé',
];

export async function generatePremadeSynopsis(
  themeLabel: string,
  requestId?: string
): Promise<SynopsisOutput> {
  if (!isGeminiAvailable()) throw new Error('Gemini API non configurée');

  const arc = STORY_ARC_TYPES[Math.floor(Math.random() * STORY_ARC_TYPES.length)];
  const tone = TONE_VARIANTS[Math.floor(Math.random() * TONE_VARIANTS.length)];
  const chapterCount = 2 + Math.floor(Math.random() * 3); // 2 à 4
  const secondaryCount = 1 + Math.floor(Math.random() * 3); // 1 à 3
  const randomSeed = Math.floor(Math.random() * 99999);

  const userPrompt = `Génère un synopsis COMPLÈTEMENT ORIGINAL et UNIQUE pour une histoire pour enfants (6-10 ans) sur le thème : "${themeLabel}".

Héros : Léo (childCharacterName: "Léo"). Le prénom sera remplacé par celui de l'enfant ensuite.

CONTRAINTES DE VARIÉTÉ (à respecter OBLIGATOIREMENT pour cette génération) :
- Type d'arc narratif imposé : ${arc}
- Ton imposé : ${tone}
- Nombre de chapitres : exactement ${chapterCount}
- Nombre de personnages secondaires : exactement ${secondaryCount}
- Graine aléatoire (utilise-la pour imaginer des détails uniques, noms de lieux inventés, objets surprenants) : #${randomSeed}

RÈGLES :
- L'histoire doit être CLAIREMENT ancrée dans le thème "${themeLabel}" : le décor, les objets, les personnages secondaires, les problèmes à résoudre doivent tous être liés à ce thème.
- Le titre doit être accrocheur et UNIQUE (pas de format type "Léo et le/la…" systématiquement).
- La morale doit être spécifique à CETTE histoire (pas de formule générique comme "l'amitié c'est important").
- Les personnages secondaires doivent avoir des noms et des personnalités distinctes.
- Invente des lieux avec des noms propres (pas juste "une forêt" mais "la Forêt des Murmures" par exemple).
- NE JAMAIS reproduire un synopsis déjà vu. Surprends-moi.

STRUCTURE JSON EXACTE OBLIGATOIRE (pas de chapitre en plus, pas de champs vides) :
{
  "title": "Titre de l'histoire",
  "childCharacterName": "Léo",
  "moral": "Une phrase (optionnel)",
  "chapters": [
    { "title": "Titre du chapitre 1", "scenes": [ { "title": "Titre scène", "summary": "Résumé en 2-4 phrases" } ] },
    { "title": "Titre du chapitre 2", "scenes": [ ... ] }
  ],
  "safetyChecklist": ["point 1", "point 2"]
}
- "chapters" : tableau avec EXACTEMENT ${chapterCount} chapitres. Chaque chapitre a "title" (string) et "scenes" (tableau avec au moins 2 scènes, chaque scène a "title" et "summary").
- "safetyChecklist" : tableau de chaînes (ex: ["pas de violence", "ton bienveillant"]), PAS un objet.

Réponds UNIQUEMENT par ce JSON, sans texte avant ou après.`;
  return generateSynopsis(PREMADE_SYNOPSIS_SYSTEM, userPrompt, requestId);
}

export async function generateSynopsis(
  systemPrompt: string,
  userPrompt: string,
  requestId?: string
): Promise<SynopsisOutput> {
  if (!isGeminiAvailable()) throw new Error('Gemini API non configurée');
  const promptHash = hashPrompt(systemPrompt + userPrompt);
  logger.info({ requestId, promptHash }, 'generateSynopsis start');

  const raw = await withRetry(async () => {
    const response = await gemini.models.generateContent({
      model: getTextModel(),
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
      ],
      config: SAFETY_CONFIG,
    });
    return extractTextOrThrow(response, 'synopsis');
  }, requestId);

  // Extraire JSON (parfois entouré de ```json ... ```)
  let jsonStr = raw.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  const parsed = JSON.parse(jsonStr) as unknown;
  const result = synopsisOutputSchema.parse(parsed);
  logger.info({ requestId, promptHash }, 'generateSynopsis success');
  return result;
}

const SEQUEL_SYNOPSIS_SYSTEM = `Tu es un "StoryPlanner" expert en histoires pour enfants. Tu crées une SUITE (tome 2) d'une histoire existante : mêmes personnages, nouvelle aventure, même ton bienveillant.
Tu produis UNIQUEMENT du JSON valide, sans texte avant ou après.
Format de réponse : même structure que d'habitude (title, childCharacterName, moral, chapters avec scenes title/summary, safetyChecklist). Le title doit évoquer la suite (ex: "... - La suite" ou "... - Tome 2").`;

export async function generateSequelSynopsis(
  previousSynopsisJson: string,
  previousFullText: string,
  requestId?: string
): Promise<SynopsisOutput> {
  if (!isGeminiAvailable()) throw new Error('Gemini API non configurée');
  const userPrompt = `Voici l'histoire existante (tome 1) — synopsis :
${previousSynopsisJson}

Et le texte complet du tome 1 (extrait si long) :
${previousFullText.slice(0, 6000)}

Génère le synopsis complet pour le TOME 2 : même héros (childCharacterName identique), nouvelle aventure, 2 à 4 chapitres, 8 à 12 scènes. Réponds UNIQUEMENT par un JSON valide avec : title, childCharacterName, moral (optionnel), chapters (title + scenes: [{ title, summary }]), safetyChecklist (optionnel).`;
  return generateSynopsis(SEQUEL_SYNOPSIS_SYSTEM, userPrompt, requestId);
}

export async function generateStory(
  systemPrompt: string,
  userPrompt: string,
  requestId?: string
): Promise<{
  fullText: string;
  scenes: Array<{
    order: number;
    title: string;
    text: string;
    imagePrompt: string;
    outfitContext?: string | null;
  }>;
  characters?: unknown[];
}> {
  if (!isGeminiAvailable()) throw new Error('Gemini API non configurée');
  const promptHash = hashPrompt(systemPrompt + userPrompt);
  logger.info({ requestId, promptHash }, 'generateStory start');

  const raw = await withRetry(async () => {
    const response = await gemini.models.generateContent({
      model: getTextModel(),
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
      ],
      config: SAFETY_CONFIG,
    });
    return extractTextOrThrow(response, 'story');
  }, requestId);

  let jsonStr = raw.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  const parsed = JSON.parse(jsonStr) as unknown;
  const result = storyOutputSchema.parse(parsed);
  logger.info({ requestId, promptHash }, 'generateStory success');
  return result;
}

export async function generateBackCoverSynopsis(
  storyTitle: string,
  fullText: string,
  language: string,
  requestId?: string
): Promise<string> {
  if (!isGeminiAvailable()) throw new Error('Gemini API non configurée');
  const prompt = `Tu es un rédacteur marketing jeunesse. Écris un synopsis court pour la 4e de couverture du livre suivant. Pas de spoiler majeur. Ton jeunesse. 500 à 900 caractères. Langue : ${language}.
Titre : ${storyTitle}
Résumé de l'histoire (pour contexte) : ${fullText.slice(0, 2000)}
Réponds uniquement par le texte du synopsis, sans préambule.`;
  const response = await withRetry(async () => {
    const res = await gemini.models.generateContent({
      model: getTextModel(),
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: SAFETY_CONFIG,
    });
    return (res as { text?: string })?.text ?? '';
  }, requestId, 30000);
  return response.trim();
}

export async function generateLayoutPlan(
  scenes: Array<{ id: string; title: string | null; text: string; hasIllustration: boolean }>,
  totalPagesTarget: number,
  requestId?: string
): Promise<{ pages: Array<{ pageNumber: number; type: 'TEXTE' | 'ILLUSTRATION_PLEINE_PAGE' | 'MIXTE'; sceneId: string | null; textContent?: string; illustrationAssetId?: string | null }> }> {
  if (!isGeminiAvailable()) throw new Error('Gemini API non configurée');
  const prompt = `Tu es un directeur de mise en page pour livre jeunesse. À partir des scènes suivantes, produis un plan de pages (JSON) pour un livre d'environ ${totalPagesTarget} pages. Chaque page a un type : TEXTE (texte seul), ILLUSTRATION_PLEINE_PAGE (image pleine page), MIXTE (texte + image). Répartis le contenu de façon équilibrée. Pas de page vide.
Scènes (order, title, hasIllustration) : ${JSON.stringify(scenes.map((s) => ({ id: s.id, title: s.title, hasIllustration: s.hasIllustration })))}
Réponds UNIQUEMENT par un JSON : { "pages": [ { "pageNumber": 1, "type": "TEXTE"|"ILLUSTRATION_PLEINE_PAGE"|"MIXTE", "sceneId": "id ou null", "textContent": "optionnel", "illustrationAssetId": "optionnel" } ] }`;
  const raw = await withRetry(async () => {
    const res = await gemini.models.generateContent({
      model: getTextModel(),
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: SAFETY_CONFIG,
    });
    return (res as { text?: string })?.text ?? '';
  }, requestId, 30000);
  let jsonStr = raw.trim();
  const m = jsonStr.match(/\{[\s\S]*\}/);
  if (m) jsonStr = m[0];
  const parsed = JSON.parse(jsonStr) as unknown;
  const result = bookLayoutPlanSchema.parse(parsed);
  return {
    pages: result.pages.map((p) => ({
      ...p,
      sceneId: p.sceneId ?? null,
    })),
  };
}

/** Prompt pour descriptif chirurgical : physique (teintes précises) + tenue sur la photo. */
const CHARACTER_DESCRIPTOR_PROMPT = `Tu es un directeur artistique pour un livre illustré pour enfants. À partir de cette photo, produis une description UNIQUE et ULTRA-PRÉCISE pour qu'un illustrateur dessine ce même enfant exactement pareil sur TOUTES les images du livre.

Réponds en deux parties séparées par " | " (barre verticale avec espaces) :

1) PHYSIQUE (à la teinte près) : teint de peau (nuance exacte : clair, doré, mat, etc.), forme du visage (ovale, rond, etc.), yeux (couleur précise, forme, cils), sourcils, cheveux (couleur exacte, LONGUEUR, TEXTURE et VOLUME, frange ou non), âge apparent, corpulence, taille approximative par rapport à un enfant de son âge, signes distinctifs (taches de rousseur, fossettes, lunettes, grain de beauté, etc.). Pas de vêtements dans cette partie.

2) TENUE SUR LA PHOTO : décris chaque vêtement avec sa couleur EXACTE et sa forme (ex: t-shirt bleu marine à manches courtes, col rond ; jean bleu délavé ; baskets blanches). Précise les motifs s'il y en a (rayures, étoiles, etc.). Inclue tous les accessoires visibles (barrette, montre, collier, etc.). Cette tenue devra être reproduite STRICTEMENT à l'identique (mêmes couleurs, mêmes motifs, mêmes accessoires) quand le personnage est dans son cadre habituel.

Langue : français. Pas de nom. Réponds UNIQUEMENT par la description, sans préambule. Format : "[partie 1] | [partie 2]".`;

export async function generateCharacterDescriptor(
  imageBase64: string,
  mimeType: string,
  requestId?: string
): Promise<string> {
  if (!isGeminiAvailable()) throw new Error('Gemini API non configurée');
  const response = await gemini.models.generateContent({
    model: getTextModel(),
    contents: [
      {
        role: 'user',
        parts: [
          { text: CHARACTER_DESCRIPTOR_PROMPT },
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    config: SAFETY_CONFIG,
  });
  const text = (response as { text?: string })?.text ?? '';
  const raw = text.trim();
  // Si le modèle a mis " | " on garde tel quel (physique + tenue). Sinon on utilise tout le texte comme descriptif.
  if (raw.includes(' | ')) return raw;
  return raw;
}
