import { z } from 'zod';

// ——— Profil enfant ———
export const childProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  age: z.number().int().min(1).max(16),
  pronouns: z.enum(['il', 'elle', 'iel']),
  interests: z.array(z.string().max(80)).max(20),
  readingLevel: z.enum(['facile', 'normal', 'avancé']),
  avoid: z.array(z.string().max(200)).max(15).optional().default([]),
  values: z.array(z.string().max(80)).max(10).optional().default([]),
});

export type ChildProfile = z.infer<typeof childProfileSchema>;

// ——— Thème ———
export const themeSchema = z.object({
  theme: z.string().min(1).max(200),
  mood: z.enum(['drôle', 'aventure', 'rassurant', 'mystérieux', 'éducatif']),
  duration: z.enum(['court', 'moyen', 'long']), // 3-5 min / 7-10 / 12-15
});

export type Theme = z.infer<typeof themeSchema>;

// ——— Idées précises (optionnel) ———
export const customIdeasSchema = z.object({
  secondaryCharacters: z.string().max(500).optional(),
  location: z.string().max(300).optional(),
  magicObjectOrMission: z.string().max(300).optional(),
  moral: z.string().max(300).optional(),
  vocabulary: z.array(z.string().max(50)).max(20).optional(),
});

export type CustomIdeas = z.infer<typeof customIdeasSchema>;

// ——— Style & images ———
export const styleSchema = z.object({
  visualStyle: z.enum([
    'animé',
    'animation_familiale',
    'manga',
    'minimaliste',
    'mignon',
    'aquarelle',
    'storybook_pastel',
    'conte_cinématographique',
  ]),
  format: z.enum(['carre', 'portrait', 'paysage']),
  resemblanceLevel: z.number().min(0).max(100).default(80), // slider
});

export type Style = z.infer<typeof styleSchema>;

// ——— Format livre ———
export const bookFormatIds = [
  'a4',
  'a5',
  'us-letter',
  '8x8',
  '6x9',
  '8.5x8.5',
] as const;

export const bookFormatSchema = z.object({
  formatId: z.enum(bookFormatIds),
  bleedMm: z.number().min(0).max(10).default(3),
  safeMarginMm: z.number().min(2).max(15).default(5),
});

export type BookFormatChoice = z.infer<typeof bookFormatSchema>;

// ——— Synopsis (sortie Gemini) ———
export const visualBeatSchema = z.object({
  sceneIndex: z.number().int().min(0),
  description: z.string(),
  mood: z.string().optional(),
});

const synopsisSceneSchema = z.object({
  title: z.string(),
  summary: z.string(),
  visualBeats: z.array(visualBeatSchema).optional(),
});

export const synopsisChapterSchema = z.object({
  title: z.string(),
  scenes: z.array(synopsisSceneSchema),
});

// Normalise safetyChecklist : Gemini peut renvoyer un objet au lieu d'un tableau.
const safetyChecklistSchema = z
  .union([
    z.array(z.string()),
    z.record(z.unknown()),
  ])
  .optional()
  .transform((x): string[] => {
    if (x == null) return [];
    if (Array.isArray(x)) return x.filter((s): s is string => typeof s === 'string');
    const obj = x as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items.filter((s): s is string => typeof s === 'string');
    if (Array.isArray(obj.points)) return obj.points.filter((s): s is string => typeof s === 'string');
    return Object.values(obj).filter((s): s is string => typeof s === 'string');
  });

// Chapitres : filtrer ceux qui sont invalides (title ou scenes manquants/incomplets).
const chapterInputSchema = z.object({
  title: z.string().optional(),
  scenes: z.array(z.object({
    title: z.string().optional(),
    summary: z.string().optional(),
    visualBeats: z.array(visualBeatSchema).optional(),
  })).optional(),
});

const chaptersSchema = z
  .array(chapterInputSchema)
  .transform((arr) =>
    arr
      .filter(
        (ch): ch is { title: string; scenes: Array<{ title: string; summary: string; visualBeats?: z.infer<typeof visualBeatSchema>[] }> } =>
          typeof ch.title === 'string' &&
          ch.title.trim() !== '' &&
          Array.isArray(ch.scenes) &&
          ch.scenes.length > 0
      )
      .map((ch) => ({
        title: ch.title,
        scenes: ch.scenes.filter(
          (s): s is { title: string; summary: string; visualBeats?: z.infer<typeof visualBeatSchema>[] } =>
            typeof s?.title === 'string' &&
            s.title.trim() !== '' &&
            typeof s?.summary === 'string' &&
            s.summary.trim() !== ''
        ),
      }))
      .filter((ch) => ch.scenes.length > 0)
  )
  .refine((chapters) => chapters.length >= 1, {
    message: 'Le synopsis doit contenir au moins un chapitre valide (titre + scènes).',
  });

export const synopsisOutputSchema = z.object({
  title: z.string(),
  childCharacterName: z.string(),
  moral: z.string().optional(),
  chapters: chaptersSchema,
  safetyChecklist: safetyChecklistSchema,
});

export type SynopsisOutput = z.infer<typeof synopsisOutputSchema>;

// ——— Personnage (description visuelle pour cohérence illustrations) ———
export const contextOutfitSchema = z.object({
  context: z.string(), // ex: "plage", "nuit", "école", "pyjama"
  outfitDescription: z.string(),
});
export type ContextOutfit = z.infer<typeof contextOutfitSchema>;

export const storyCharacterSchema = z.object({
  name: z.string(),
  role: z.enum(['principal', 'secondaire']),
  /** Relation / label (ex. "sœur", "frère", "enfant principal") — évite les confusions entre personnages. */
  relation: z.string().optional(),
  /** Description physique seule : visage, cheveux, yeux, teint, âge, corpulence. Très détaillée (teintes précises). */
  visualDescription: z.string(),
  /** Tenue portée par défaut dans l'histoire. Décrite au détail (couleur, coupe, accessoires). */
  defaultOutfit: z.string().optional(),
  /** Tenues selon le contexte (plage, pyjama, etc.) quand différent du default. */
  contextOutfits: z.array(contextOutfitSchema).optional().default([]),
});
export type StoryCharacter = z.infer<typeof storyCharacterSchema>;

// ——— Histoire finale (sortie Gemini) ———
export const sceneOutputSchema = z.object({
  order: z.number().int().min(0),
  title: z.string(),
  text: z.string(),
  imagePrompt: z.string(),
  /** Contexte de tenue pour cette scène (ex: "plage", "nuit") si différent du quotidien. */
  outfitContext: z.union([z.string(), z.null()]).optional(),
});

export const storyOutputSchema = z.object({
  fullText: z.string(),
  scenes: z.array(sceneOutputSchema),
  characters: z.array(storyCharacterSchema).optional().default([]),
});

export type StoryOutput = z.infer<typeof storyOutputSchema>;

// ——— Book layout plan ———
export const pageTypeEnum = z.enum(['TEXTE', 'ILLUSTRATION_PLEINE_PAGE', 'MIXTE']);
export const layoutPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  type: pageTypeEnum,
  sceneId: z.string().nullable().default(null),
  textContent: z.string().optional(),
  illustrationAssetId: z.string().nullable().optional(),
});
export const bookLayoutPlanSchema = z.object({
  pages: z.array(layoutPageSchema),
  templateId: z.string().optional(),
});
export type BookLayoutPlan = z.infer<typeof bookLayoutPlanSchema>;

// ——— Settings projet (JSON) ———
export const projectSettingsSchema = z.object({
  child: childProfileSchema,
  theme: themeSchema,
  ideas: customIdeasSchema.optional(),
  style: styleSchema,
  bookFormat: bookFormatSchema.optional(),
  hasPhotoRefs: z.boolean().default(false),
  hasOutfitPhoto: z.boolean().default(false),
  /** Synopsis préfait (JSON string) quand l'utilisateur a choisi une histoire par thème. */
  premadeSynopsis: z.string().optional(),
});
export type ProjectSettings = z.infer<typeof projectSettingsSchema>;
