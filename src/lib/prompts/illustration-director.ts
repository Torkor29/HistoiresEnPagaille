/**
 * IllustrationDirector — Stratégie d'identité persistante basée sur référence visuelle.
 *
 * Principe : le personnage est un ASSET VISUEL PERMANENT, pas une description textuelle.
 *   Phase 1 — On génère un "Character Base" (fiche d'identité stylisée) UNE SEULE FOIS.
 *   Phase 2 — Chaque scène réutilise cette image comme référence verrouillée.
 *             On ne redécrit JAMAIS le physique. On décrit SEULEMENT la scène + tenue si changée.
 */

import { getStylePromptSuffix } from './story-writer';
import type { StoryCharacter } from '@/lib/schemas';

export type BookContext = { title: string; mood?: string };

// ---------------------------------------------------------------------------
// Phase 1 — Génération du Character Base (fiche d'identité permanente)
// ---------------------------------------------------------------------------

/**
 * Prompt pour générer la fiche d'identité visuelle permanente d'un personnage.
 * Utilisé UNE SEULE FOIS par personnage, avec la photo originale en référence.
 * Le résultat (image stylisée, fond neutre) devient le CHARACTER_REF verrouillé.
 */
export function getCharacterBasePrompt(
  character: StoryCharacter,
  visualStyle: string,
  format: 'carre' | 'portrait' | 'paysage'
): string {
  const style = getStylePromptSuffix(visualStyle);
  const ratio =
    format === 'carre'
      ? 'Square composition'
      : format === 'portrait'
        ? 'Portrait orientation (vertical)'
        : 'Landscape orientation (horizontal)';

  const outfit = character.defaultOutfit
    ? `The character wears: ${character.defaultOutfit}`
    : 'Casual children clothing appropriate for the character age.';

  return [
    'Create a single CHARACTER IDENTITY REFERENCE SHEET for a children\'s illustrated book.',
    '',
    'You are given a real photograph of a person. Your task is to create a STYLIZED VERSION of this exact person in the art style specified below, while preserving their visual identity with surgical precision.',
    '',
    'MANDATORY — Preserve from the photograph with ZERO deviation:',
    '- EXACT facial structure: face shape (round, oval, heart, square), jawline, chin shape, forehead proportions',
    '- EXACT eye appearance: iris color (precise shade), eye shape (almond, round, hooded), spacing between eyes, eyelash density',
    '- EXACT skin tone: precise shade as seen in the photo (fair, light golden, olive, tan, medium brown, dark — match it exactly)',
    '- EXACT hair: color (precise shade), length (short/medium/long), volume (thin/medium/thick), texture (straight/wavy/curly/coily), bangs or no bangs, parting side',
    '- EXACT body proportions: height relative to apparent age, build (slender, average, stocky)',
    '- ALL distinguishing features: freckles, dimples, glasses, beauty marks, gap teeth, scars — include every one visible in the photo',
    '',
    'COMPOSITION REQUIREMENTS:',
    '- Character standing ALONE in a relaxed 3/4 pose, slight friendly smile',
    '- Plain white or very light gray background — absolutely NO scenery, NO props, NO other characters, NO patterns, NO decorations',
    '- Full body visible from head to shoes, centered in frame with comfortable margins',
    '- Even, soft lighting from front-left — no dramatic shadows, no backlighting',
    '- Character takes approximately 70% of the frame height',
    '',
    outfit,
    '',
    `ART STYLE: ${style}`,
    `FORMAT: ${ratio}`,
    '',
    'CRITICAL: This image will be used as the PERMANENT, LOCKED visual identity for this character throughout the ENTIRE book. It will be the sole reference for every subsequent illustration. Every facial detail, hair detail, and body proportion must be preserved with absolute fidelity to the original photograph.',
    '',
    'Children\'s book illustration, age-appropriate content. No violence. No text in the image.',
  ].join('\n');
}

/**
 * Prompt pour générer une fiche d'identité à partir d'une DESCRIPTION TEXTE uniquement (pas de photo).
 * Utilisé pour les personnages secondaires générés par l'histoire (Mia, le pirate, etc.) :
 * on crée une référence visuelle verrouillée une fois, puis on la réutilise comme le perso principal.
 */
export function getCharacterBaseFromDescriptionPrompt(
  character: StoryCharacter,
  visualStyle: string,
  format: 'carre' | 'portrait' | 'paysage'
): string {
  const style = getStylePromptSuffix(visualStyle);
  const ratio =
    format === 'carre'
      ? 'Square composition'
      : format === 'portrait'
        ? 'Portrait orientation (vertical)'
        : 'Landscape orientation (horizontal)';

  const isAnimal = isAnimalCharacter(character);
  const outfit = isAnimal
    ? 'Do NOT draw any human clothing on this character. Draw in natural animal form only (no t-shirts, no pants). At most one small thematic accessory if the story requires it.'
    : character.defaultOutfit
      ? `Outfit: ${character.defaultOutfit}`
      : 'Casual, age-appropriate clothing, colorful and child-friendly.';

  const isSecondary = character.role === 'secondaire';
  const secondaryNote = isSecondary
    ? ' This is a SECONDARY character (e.g. adult, clown, mentor). Draw them as an ADULT in their BASE look (face, base haircut, proportions). In the book, in certain contexts (e.g. circus) they will wear the same added look (wig, costume) in every scene of that context; the reference is the base.'
    : '';

  return [
    'Create a single CHARACTER IDENTITY REFERENCE SHEET for a children\'s illustrated book. There is NO reference photograph — you must create the character from the description below. This image will become the LOCKED visual reference for this character in the entire book.',
    '',
    'CHARACTER DESCRIPTION (follow with precision):',
    `- Name / role: ${character.name}${secondaryNote}`,
    `- Physical description: ${character.visualDescription}`,
    outfit,
    '',
    'REQUIREMENTS:',
    '- One character only, standing in a relaxed 3/4 pose, slight friendly smile',
    '- Plain white or very light gray background — NO scenery, NO props, NO other characters',
    '- Full body visible from head to feet, centered, even soft lighting',
    '- Character takes approximately 70% of the frame height',
    '- Design must be CONSISTENT and MEMORABLE so that the same character can be recognized in every subsequent illustration (same face shape, hair, skin tone, proportions)',
    '',
    `ART STYLE: ${style}`,
    `FORMAT: ${ratio}`,
    '',
    'CRITICAL: This reference sheet will be used as the PERMANENT identity for this character. All future illustrations must copy this face, hair, and body exactly. Create a clear, distinctive design.',
    '',
    'Children\'s book illustration, age-appropriate. No violence. No text in the image.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Phase 2 — Génération des scènes (basée sur images de référence)
// ---------------------------------------------------------------------------

/** Mots-clés indiquant un personnage animal (pas d'habillage humain). */
const ANIMAL_KEYWORDS = [
  'poisson', 'fish', 'crabe', 'crab', 'animal', 'creature', 'sirène', 'mermaid',
  'tortue', 'turtle', 'étoile de mer', 'starfish', 'pieuvre', 'octopus', 'requin', 'shark',
  'dauphin', 'dolphin', 'baleine', 'whale', 'otarie', 'seal', 'hippocampe', 'seahorse',
];

function isAnimalCharacter(c: StoryCharacter): boolean {
  const desc = (c.visualDescription || '').toLowerCase();
  const name = (c.name || '').toLowerCase();
  return ANIMAL_KEYWORDS.some((k) => desc.includes(k) || name.includes(k));
}

/**
 * Construit une ligne de verrouillage physique court pour éviter les confusions (garçon roux vs fille brune).
 * Utilise visualDescription pour extraire garçon/fille et couleur de cheveux.
 */
function getTraitLockLine(c: StoryCharacter): string {
  if (isAnimalCharacter(c)) return 'animal (draw as in reference)';
  const d = (c.visualDescription || '').toLowerCase();
  const isGirl = /\b(fille|girl|female)\b|longs?\s+cheveux|robe/.test(d) || (/\belle\b/.test(d));
  const isBoy = /\b(garçon|boy|male)\b|court[s]?\s+cheveux/.test(d);
  let gender = '';
  if (isGirl && !isBoy) gender = 'girl';
  else if (isBoy || !isGirl) gender = 'boy'; // default to boy for child principal if unclear
  else if (isGirl) gender = 'girl';

  let hair = '';
  if (/\broux?\b|red\s+hair|auburn/.test(d)) hair = 'RED hair';
  else if (/\bblond[s]?\b|blonde|blond\s+hair/.test(d)) hair = 'BLONDE hair';
  else if (/\bbrun[s]?\b|brown\s+hair|châtain/.test(d)) hair = 'BROWN hair';
  else if (/\bnoir[s]?\b|black\s+hair/.test(d)) hair = 'BLACK hair';
  else hair = 'same hair as in reference';

  const relation = (c as { relation?: string }).relation?.trim();
  const label = relation ? `${c.name} (${relation})` : c.name;
  return `${label}: ${gender}, ${hair}`.trim();
}

/**
 * Détermine le changement de tenue pour un personnage dans une scène.
 * Retourne null si la tenue par défaut s'applique ou si le personnage est un animal (pas de vêtements).
 */
function getOutfitChangeInstruction(
  character: StoryCharacter,
  sceneOutfitContext?: string | null
): string | null {
  if (isAnimalCharacter(character)) return null;

  const contextKey = (sceneOutfitContext || '').trim().toLowerCase();
  if (!contextKey) return null;

  const contextOutfit =
    character.contextOutfits?.length
      ? character.contextOutfits.find(
          (o) => o.context.trim().toLowerCase() === contextKey
        )
      : null;

  if (!contextOutfit) return null;

  return `Outfit change for ${character.name}: ${contextOutfit.outfitDescription}. Face and body remain EXACTLY as in the reference image. Apply this context outfit (clothing and any hat/wig as described) for this scene.`;
}

/**
 * Prompt principal pour chaque scène du livre.
 *
 * Si hasCharacterRefImages = true (mode normal) :
 *   → On NE redécrit PAS les personnages. On les utilise via référence visuelle.
 *   → Prompt minimal : identité verrouillée + scène + tenue si changée.
 *
 * Si hasCharacterRefImages = false (fallback sans photos) :
 *   → On utilise une description textuelle allégée (ancien mode dégradé).
 */
export function getSceneIllustrationPrompt(
  scenePrompt: string,
  characterDescriptor: string,
  visualStyle: string,
  format: 'carre' | 'portrait' | 'paysage',
  resemblanceLevel: number,
  bookContext?: BookContext | null,
  allCharacters?: StoryCharacter[] | null,
  sceneOutfitContext?: string | null,
  hasCharacterRefImages: boolean = false,
  /** Correction utilisateur (ex: "Soën doit porter le costume bleu à étoiles, pas le pyjama gris") — injectée en priorité dans le prompt */
  userCorrection?: string | null
): string {
  const style = getStylePromptSuffix(visualStyle);
  const framing =
    format === 'carre'
      ? 'Square framing'
      : format === 'portrait'
        ? 'Portrait framing (vertical)'
        : 'Landscape framing (horizontal)';

  const bookPrefix =
    bookContext?.title || bookContext?.mood
      ? `Book: "${bookContext.title || 'Story'}". ${bookContext.mood ? `Mood: ${bookContext.mood}. ` : ''}`
      : '';

  // ===== MODE RÉFÉRENCE VISUELLE (stratégie principale) =====
  if (hasCharacterRefImages) {
    const parts: string[] = [];

    parts.push(bookPrefix);
    parts.push('');

    // ----- MAPPING EXPLICITE + VERROU TRAITS (jamais mélanger les personnages) -----
    if (allCharacters && allCharacters.length > 0) {
      parts.push('=== REFERENCE IMAGES (order fixed — NEVER SWAP CHARACTERS) ===');
      const mappingLines: string[] = [];
      const traitLocks: string[] = [];
      let principalImageIndex = 0;
      for (let i = 0; i < allCharacters.length; i++) {
        const c = allCharacters[i];
        if (c.role === 'principal') principalImageIndex = i + 1;
        const trait = getTraitLockLine(c);
        mappingLines.push(`Image ${i + 1} = ${trait}.`);
        if (!isAnimalCharacter(c)) {
          traitLocks.push(`Character in image ${i + 1} has ${trait.split(':')[1]?.trim() || trait} — in EVERY scene, this character must keep these traits.`);
        }
      }
      parts.push(mappingLines.join(' '));
      parts.push('NEVER SWAP: The boy with red hair is ALWAYS the character from image 1 (if image 1 is boy, red hair). The girl with brown hair is ALWAYS the character from her image. Do not draw the wrong hair color or wrong gender for a character. Each reference image = one identity. Copy each exactly.');
      if (traitLocks.length > 0) {
        parts.push(...traitLocks);
      }
      parts.push('Draw each character EXACTLY as in their reference image. Same face, same hair color, same body. Do not redesign, do not swap, do not invent a different look.');
      if (principalImageIndex > 0) {
        parts.push(`CRITICAL: The human child (principal) is reference image ${principalImageIndex}. Draw him/her with the EXACT same face, hair color, hair style, eyes, skin tone and proportions as in that image. No artistic reinterpretation.`);
      }
      parts.push('');
    }

    // ----- BLOC DE BASE (invariant pour tout le livre) -----
    parts.push('=== BASE (same for the whole book) ===');
    parts.push('IDENTITY LOCK: Draw the character(s) EXACTLY as in the reference image(s). Same face, base haircut, skin tone, proportions on every page. Pose, expression and outfit (including hat/wig when the scene context requires it) may change.');
    parts.push('STRICT: Preserve from each reference: facial structure, eyes, skin tone, base haircut, body proportions, distinguishing features. Do not redesign or introduce new characters. Hats, wigs (e.g. clown), costumes are added on top when the scene context requires it.');
    parts.push('');
    parts.push('CHARACTER SIZE RATIO (non-negotiable): If the story has a child and an adult (e.g. clown, mentor, parent), the adult must ALWAYS be clearly taller and larger than the child in every illustration. Never invert this ratio. Never draw the adult the same height as the child or smaller. Keep this proportion constant across the entire book.');
    parts.push('');
    parts.push('HAIR AND COSTUME — BASE FIRST, THEN CONTEXT: Each character has a BASE look from their reference (face, base haircut, skin, proportions). That base never changes. On top of that, when the scene context requires it (e.g. circus → clown outfit and clown wig; pirate → hat and costume), add the same context look for that character in every scene of that context. So: same base haircut as reference; in circus scenes always the same clown look (wig + costume); in beach scenes same beach outfit; etc. Do NOT randomly switch (e.g. clown wig in one circus scene, base hair in another). Do not swap looks between characters.');
    parts.push('');
    parts.push('ANIMAL CHARACTERS: Draw in natural form only. No human clothes on animals. At most one small thematic accessory if the story requires it.');
    parts.push('Do NOT mix human and animal: the child is 100% human (no animal ears, no tail, no fur). Animals are separate characters. Each reference image is ONE character — do not blend them.');
    parts.push('');
    parts.push('BACKGROUND: Every image must have a clear, detailed environment (no flat empty background). Underwater = water, plants, rocks, coral, bubbles; beach = sand, sea, sky; etc.');
    parts.push('');

    // ----- CONTEXTE DE CETTE SCÈNE (source de vérité : l'histoire) -----
    parts.push('=== THIS SCENE (from the story — use this as the source of truth) ===');
    parts.push(`SCENE DESCRIPTION: ${scenePrompt}`);
    parts.push('Illustrate exactly what this text describes (same characters, same action, same setting). The child and any animals must look exactly like their reference images; only pose and placement change.');
    parts.push('');

    // ----- TENUE EXACTE POUR CETTE SCÈNE (éviter tenue grise / générique) -----
    if (allCharacters && allCharacters.length > 0) {
      const outfitBlocks: string[] = [];
      for (const c of allCharacters) {
        if (isAnimalCharacter(c)) continue;
        const contextKey = (sceneOutfitContext || '').trim().toLowerCase();
        const contextOutfit =
          contextKey && c.contextOutfits?.length
            ? c.contextOutfits.find((o) => o.context.trim().toLowerCase() === contextKey)
            : null;
        const outfitText = contextOutfit
          ? `CONTEXT "${contextKey}": ${contextOutfit.outfitDescription}`
          : c.defaultOutfit
            ? `DEFAULT (daily outfit): ${c.defaultOutfit}`
            : null;
        if (outfitText) {
          outfitBlocks.push(`${c.name} (ref image): ${outfitText}`);
        }
      }
      if (outfitBlocks.length > 0) {
        parts.push('OUTFIT FOR THIS SCENE — draw EXACTLY this (do NOT draw grey, generic, or different clothing):');
        parts.push(...outfitBlocks);
        parts.push('');
      }
    }
    if (sceneOutfitContext) {
      parts.push(`OUTFIT CONTEXT KEY: "${sceneOutfitContext}". Use the context outfit described above for this scene.`);
      parts.push('');
    }
    parts.push('CONSISTENCY RULE — Apply changes ONLY when the story explicitly says so:');
    parts.push('- Same location + same outfit context (e.g. same underwater grotto, same "sous-marin") → same outfit, same atmosphere (same fog/brouillard, same lighting). Do NOT vary.');
    parts.push('- When the STORY explicitly describes a change, apply it: new place (e.g. he enters a cave, he goes back to the beach) → new location and new outfit context; character changes clothes (e.g. "he puts on his best costume") → new outfit; atmosphere change (e.g. "the sky clears", "the fog lifts") → change the atmosphere. Otherwise stay consistent.');
    parts.push('- So: if this scene is in a new place (e.g. grotto under water), then location = that place and outfit = that context. If this scene is still the same place as before, keep the same decor and same outfit as in previous images of that place.');
    parts.push('');

    // Personnages dans la scène + tenues si changées (uniquement humains)
    if (allCharacters && allCharacters.length > 0) {
      const characterLines: string[] = [];
      const outfitLines: string[] = [];
      const principal = allCharacters.find((c) => c.role === 'principal');
      const secondaries = allCharacters.filter((c) => c.role === 'secondaire');

      for (let i = 0; i < allCharacters.length; i++) {
        const c = allCharacters[i];
        const sizeHint = c.role === 'principal' ? ' — child, draw SMALL' : ' — adult/larger character, draw TALLER than the child';
        characterLines.push(`- ${c.name} (reference image ${i + 1})${sizeHint}`);

        const outfitChange = getOutfitChangeInstruction(c, sceneOutfitContext);
        if (outfitChange) {
          outfitLines.push(outfitChange);
        }
      }

      parts.push('CHARACTERS IN THIS SCENE (draw each exactly as in their reference; do not swap hair or costume between them):');
      parts.push(...characterLines);
      if (principal && secondaries.length > 0) {
        parts.push(`SIZE: ${principal.name} must be visibly smaller than ${secondaries.map((s) => s.name).join(' and ')}. Same ratio in every image.`);
      }
      parts.push('');

      if (outfitLines.length > 0) {
        parts.push('OUTFIT CHANGES FOR THIS SCENE ONLY (human characters only):');
        parts.push(...outfitLines);
        parts.push('');
      }
    }

    // Style (identique sur tout le livre)
    parts.push(`ART STYLE (consistent across entire book): ${style}. ${framing}.`);
    parts.push('');
    parts.push('FINAL REMINDER: Each character = same face, same base haircut (from reference). In a given context (e.g. circus, beach), use the same added look (hat, wig, costume) for that context on every page. Do not mix base hair and clown wig in the same context. Child stays small, adult stays tall. No text in the image.');
    parts.push('The child character must be a direct copy of their reference image — if you draw a different face or different hair, the illustration is wrong. Copy the reference exactly.');
    parts.push('Children\'s book illustration, age-appropriate. No violence.');
    if (userCorrection?.trim()) {
      parts.push('');
      parts.push('=== USER CORRECTION (APPLY STRICTLY — this overrides any ambiguity above) ===');
      parts.push(userCorrection.trim());
    }
    return parts.join('\n');
  }

  // ===== MODE FALLBACK TEXTUEL (pas de photos fournies) =====
  const fallbackDesc =
    allCharacters && allCharacters.length > 0
      ? allCharacters
          .map((c) => {
            if (isAnimalCharacter(c)) {
              return `${c.name}: ${c.visualDescription}. (Animal — do not dress in human clothes.)`;
            }
            const outfitChange = getOutfitChangeInstruction(c, sceneOutfitContext);
            const outfit = outfitChange
              ? outfitChange
              : c.defaultOutfit
                ? `Default outfit: ${c.defaultOutfit}`
                : '';
            return `${c.name}: ${c.visualDescription}. ${outfit}`.trim();
          })
          .join('\n')
      : characterDescriptor;

  const hasPrincipalAndSecondary =
    allCharacters && allCharacters.length >= 2 &&
    allCharacters.some((c) => c.role === 'principal') &&
    allCharacters.some((c) => c.role === 'secondaire');
  const sizeRule = hasPrincipalAndSecondary
    ? 'CHARACTER SIZE: The child (principal) must be visibly smaller than the adult/secondary character(s) in every image. Never invert. HAIR/COSTUME: Start from each character\'s base look; in a given context use the same added outfit (and hat/wig when applicable) in every scene of that context.'
    : '';

  const fallbackParts = [
    bookPrefix,
    'Use the scene description below as the source of truth. Same place = same outfit and same atmosphere; only change when the story explicitly says so (new location, character changes clothes, sky clears, etc.).',
    '',
    scenePrompt,
    sceneOutfitContext ? `Outfit context for this scene: "${sceneOutfitContext}".` : '',
    '',
    'BACKGROUND: Detailed background required. Same location = same fog/brouillard/lighting unless the story describes a change.',
    sizeRule,
    'ANIMAL CHARACTERS: Natural form only, no human clothes.',
    '',
    'Keep each character STRICTLY consistent: same face, same base haircut; in a given context same added outfit (hat, wig, costume). Do not swap looks between characters.',
    fallbackDesc,
    '',
    `Art style: ${style}. ${framing}.`,
    'Children\'s book illustration, no violence. No text in the image.',
  ];
  if (userCorrection?.trim()) {
    fallbackParts.push('', '=== USER CORRECTION (APPLY STRICTLY) ===', userCorrection.trim());
  }
  return fallbackParts.join('\n');
}

// ---------------------------------------------------------------------------
// Couverture
// ---------------------------------------------------------------------------

export function getCoverIllustrationPrompt(
  title: string,
  characterDescriptor: string,
  visualStyle: string,
  widthMm: number,
  heightMm: number,
  hasCharacterRefImages: boolean = false,
  coverOutfitContext?: string | null,
  coverOutfitDescription?: string | null
): string {
  const style = getStylePromptSuffix(visualStyle);
  const ratio = widthMm > heightMm ? 'landscape' : widthMm < heightMm ? 'portrait' : 'square';

  // Ne pas mettre le titre dans le prompt : le modèle le redessine sinon. Le titre est ajouté par l'app.
  const noTextRule = 'CRITICAL — ABSOLUTELY NO TEXT IN THE IMAGE: Do not draw any letters, words, numbers, or writing anywhere. No book title, no labels, no text on objects or in the sky. The cover must be a PURE ILLUSTRATION ONLY. The title is added separately by the application. If you draw any text the image will be rejected.';

  const sameDA = 'SAME ART DIRECTION AS THE REST OF THE BOOK: This cover must look like the same book. Use the EXACT same visual style, same rendering, same mood as the interior illustrations. No different style or outfit unless specified below.';
  const outfitBlock =
    coverOutfitDescription && coverOutfitDescription.trim()
      ? [
          'OUTFIT — COHERENT WITH THE STORY: The character MUST wear exactly this outfit so the cover matches the interior:',
          `"${coverOutfitDescription.trim()}"`,
          'Do not invent a different outfit. Same context as the story (e.g. underwater story = underwater outfit, beach story = beach outfit).',
        ].join('\n')
      : '';

  if (hasCharacterRefImages) {
    const parts = [
      noTextRule,
      '',
      'Children\'s book COVER — illustration only (title added by app).',
      '',
      sameDA,
      ...(outfitBlock ? ['', outfitBlock, ''] : []),
      'IDENTITY LOCK — Use the provided character reference image as the PERMANENT visual identity.',
      'Preserve EXACTLY from reference: facial structure, eye shape/color, skin tone, base haircut, body proportions, distinguishing features.',
      'Only the OUTFIT (and any hat/wig for the cover context) may differ from the reference if specified above. Do NOT redesign the face or body.',
      '',
      'COMPOSITION:',
      `- ${ratio} cover format, composition that will have the title overlaid at top or center later`,
      '- Main character prominently featured, inviting and warm composition',
      '- Background suggests the story\'s world (same universe as the interior). Attractive lighting, vibrant but harmonious colors.',
      '',
      `ART STYLE (must match interior): ${style}.`,
      '',
      noTextRule,
    ];
    return parts.join('\n');
  }

  return [
    noTextRule,
    '',
    'Children\'s book COVER — illustration only (title added by app).',
    sameDA,
    outfitBlock ? outfitBlock + '\n\n' : '',
    `Main character: ${characterDescriptor}.`,
    `Art style: ${style}. ${ratio} cover format. Composition ready for title to be overlaid later.`,
    'Attractive lighting. Age-appropriate content.',
    '',
    noTextRule,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Utilitaires (conservés pour compatibilité)
// ---------------------------------------------------------------------------

/** Ancien getCharacterRefPrompt — redirige vers getCharacterBasePrompt. */
export function getCharacterRefPrompt(
  characterDescriptor: string,
  visualStyle: string,
  format: 'carre' | 'portrait' | 'paysage'
): string {
  const placeholder: StoryCharacter = {
    name: 'Character',
    role: 'principal',
    visualDescription: characterDescriptor,
    defaultOutfit: undefined,
    contextOutfits: [],
  };
  return getCharacterBasePrompt(placeholder, visualStyle, format);
}

/** Ancien getCharacterDescriptionForScene — conservé pour le fallback textuel. */
export function getCharacterDescriptionForScene(
  character: StoryCharacter,
  sceneOutfitContext?: string | null
): string {
  const contextKey = (sceneOutfitContext || '').trim().toLowerCase();
  const contextOutfit =
    contextKey && character.contextOutfits?.length
      ? character.contextOutfits.find(
          (o) => o.context.trim().toLowerCase() === contextKey
        )
      : null;
  const outfit = contextOutfit
    ? contextOutfit.outfitDescription
    : character.defaultOutfit || '';

  if (!outfit) return character.visualDescription;
  return `${character.visualDescription} | Outfit: ${outfit}`;
}

export function getFixFacePrompt(originalPrompt: string): string {
  return `Same scene as described below, but with a harmonious, well-proportioned child face and gentle expression. ${originalPrompt}`;
}
