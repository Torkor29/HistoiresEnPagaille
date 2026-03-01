import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getStorage } from '@/server/storage';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateImageWithProvider, getDefaultImageProvider } from '@/server/services/image-providers';
import { getGeminiUserMessage } from '@/server/services/gemini-client';
import type { ImageProviderId } from '@/server/services/image-providers';
import { generateCharacterDescriptor } from '@/server/services/gemini-text';
import { withProjectLock } from '@/server/utils/project-generation-lock';
import {
  getCharacterBasePrompt,
  getCharacterBaseFromDescriptionPrompt,
  getSceneIllustrationPrompt,
  type BookContext,
} from '@/lib/prompts/illustration-director';
import { v4 } from 'uuid';
import type { ProjectSettings, StoryCharacter } from '@/lib/schemas';
import { compressImageBuffer } from '@/server/utils/compress-image';
import { logger } from '@/lib/logger';
import type { ImageAspectRatio } from '@/server/services/image-providers/types';

function formatToAspectRatio(format: string): ImageAspectRatio {
  switch (format) {
    case 'carre': return '1:1';
    case 'paysage': return '4:3';
    case 'portrait':
    default: return '3:4';
  }
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

async function readAssetBuffer(url: string): Promise<{ buffer: Buffer; mime: string }> {
  const fullPath = join(UPLOAD_DIR, url);
  const buffer = await readFile(fullPath);
  const mime = url.endsWith('.jpg') || url.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
  return { buffer, mime };
}

const VALID_PROVIDERS: ImageProviderId[] = ['gemini', 'replicate', 'local'];

/**
 * Génération des illustrations — flux imposé :
 * 1. L'histoire doit exister (synopsis + texte + scènes + personnages).
 * 2. Phase 1 : pour chaque personnage avec photo → fiche d'identité verrouillée (character base).
 * 3. Phase 1.5 : pour chaque personnage SANS photo (secondaires générés par l'histoire) → fiche à partir de la description texte.
 * 4. Phase 2 : chaque scène est illustrée en utilisant les références verrouillées (pas de re-description).
 * Ainsi principal et secondaires sont traités de la même façon : identité générée une fois, réutilisée partout.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const projectId = (await params).id;
  return withProjectLock(projectId, async () => {
    const requestId = v4();
    const body = await req.json().catch(() => ({}));
    const mode: 'consistency' | 'fast' = body.mode === 'fast' ? 'fast' : 'consistency';
    const imageProvider: ImageProviderId = VALID_PROVIDERS.includes(body.imageProvider)
      ? body.imageProvider
      : getDefaultImageProvider();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        story: { include: { scenes: { orderBy: { order: 'asc' } } } },
        assets: true,
      },
    });
    if (!project?.story) {
      return NextResponse.json({ error: 'Projet ou histoire introuvable' }, { status: 404 });
    }
    if (!project.story.scenes?.length) {
      return NextResponse.json(
        { error: 'Générer d\'abord l\'histoire (synopsis + texte). Les personnages seront verrouillés à partir de l\'histoire, puis les illustrations créées.' },
        { status: 400 }
      );
    }

    const settings = JSON.parse(project.settings || '{}') as ProjectSettings;
    const style = settings.style || {
      visualStyle: 'storybook_pastel',
      format: 'portrait',
      resemblanceLevel: 80,
    };

    const photoRefs = project.assets.filter((a) => a.type === 'PHOTO_REF');
    let characterDescriptor = 'Enfant, apparence générique bienveillante.';

    let characters: StoryCharacter[] = [];
    try {
      if (project.story.characterDescriptors) {
        characters = JSON.parse(project.story.characterDescriptors) as StoryCharacter[];
      }
    } catch {
      // ignore invalid JSON
    }

    if (mode === 'consistency' && project.story.scenes.length > 0 && (!characters || characters.length === 0)) {
      return NextResponse.json(
        {
          error:
            'Aucun personnage enregistré. Générez ou régénérez l\'histoire d\'abord : l\'histoire enregistre la liste des personnages (principal + secondaires), puis les illustrations les verrouillent et les réutilisent.',
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // Phase 0 — Regrouper les photos par personnage + descripteurs texte
    // ------------------------------------------------------------------
    type PhotoRefWithMeta = typeof photoRefs[number] & { metadataObj?: { characterName?: string } };
    const photoRefsWithMeta: PhotoRefWithMeta[] = photoRefs.map((a) => {
      let metadataObj: { characterName?: string } | undefined;
      if (a.metadata) {
        try {
          metadataObj = JSON.parse(a.metadata) as { characterName?: string };
        } catch {
          metadataObj = undefined;
        }
      }
      return { ...a, metadataObj };
    });

    const byCharacter: Record<string, PhotoRefWithMeta[]> = {};
    for (const ref of photoRefsWithMeta) {
      const key = (ref.metadataObj?.characterName || settings.child?.firstName || 'Enfant').trim();
      if (!byCharacter[key]) byCharacter[key] = [];
      byCharacter[key].push(ref);
    }

    const childName = settings.child?.firstName;
    const heroKey =
      (childName && byCharacter[childName])
        ? childName
        : Object.keys(byCharacter)[0] || null;

    // Génère un descripteur textuel pour chaque personnage (métadonnées + fallback).
    if (mode === 'consistency' && Object.keys(byCharacter).length > 0) {
      for (const [name, refs] of Object.entries(byCharacter)) {
        try {
          const first = await readAssetBuffer(refs[0].url);
          const desc = await generateCharacterDescriptor(
            first.buffer.toString('base64'),
            first.mime,
            requestId
          );
          const parts = desc.split(/\s*\|\s*/);
          const physical = parts[0]?.trim() || desc;
          const outfitFromPhoto = parts[1]?.trim() || '';

          if (heroKey && name === heroKey) {
            characterDescriptor = desc;
          }

          let idx = characters.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
          if (idx === -1 && name.toLowerCase() === (childName || '').toLowerCase()) {
            idx = characters.findIndex((c) => c.role === 'principal');
          }
          characters = [...characters];
          if (idx >= 0) {
            characters[idx] = {
              ...characters[idx],
              name: characters[idx].name || name,
              visualDescription: physical,
              defaultOutfit: outfitFromPhoto || characters[idx].defaultOutfit,
            };
          } else {
            characters.push({
              name,
              role: heroKey && name === heroKey ? 'principal' : 'secondaire',
              visualDescription: physical,
              defaultOutfit: outfitFromPhoto || undefined,
              contextOutfits: [],
            } as StoryCharacter);
          }
        } catch {
          // on ignore les erreurs de descriptor et on continue
        }
      }
    }

    // ------------------------------------------------------------------
    // Phase 1 — CHARACTER BASE pour les personnages AVEC photo
    // Photo → fiche stylisée verrouillée (référence pour tout le livre).
    // ------------------------------------------------------------------
    const characterBasesByName = new Map<string, { mimeType: string; base64: string }>();

    if (mode === 'consistency' && Object.keys(byCharacter).length > 0) {
      logger.info({ requestId, characterCount: Object.keys(byCharacter).length }, 'Phase 1: character base from photos');

      for (const [name, refs] of Object.entries(byCharacter)) {
        try {
          let character = characters.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (!character && heroKey && name === heroKey) {
            character = characters.find((c) => c.role === 'principal');
          }
          if (!character) continue;

          const originalPhotos: Array<{ mimeType: string; base64: string }> = [];
          for (const ref of refs.slice(0, 2)) {
            const { buffer, mime } = await readAssetBuffer(ref.url);
            originalPhotos.push({ mimeType: mime, base64: buffer.toString('base64') });
          }

          const basePrompt = getCharacterBasePrompt(
            character,
            style.visualStyle,
            style.format as 'carre' | 'portrait' | 'paysage'
          );

          let baseBuffer = await generateImageWithProvider(imageProvider, {
            prompt: basePrompt,
            referenceImages: originalPhotos,
            mode: 'consistency',
            aspectRatio: formatToAspectRatio(style.format),
            requestId,
          });

          try {
            const compressed = await compressImageBuffer(baseBuffer, 'image/png');
            baseBuffer = compressed.buffer;
          } catch {
            // keep original
          }

          const key = `projects/${projectId}/character-base-${character.name.replace(/\s+/g, '-').toLowerCase()}-${v4()}.png`;
          await getStorage().upload(key, baseBuffer, 'image/png');
          await prisma.asset.create({
            data: {
              projectId,
              type: 'CHARACTER_REF',
              url: key,
              metadata: JSON.stringify({ characterName: character.name, phase: 'character_base_from_photo' }),
            },
          });

          characterBasesByName.set(character.name, { mimeType: 'image/png', base64: baseBuffer.toString('base64') });
          logger.info({ requestId, characterName: character.name }, 'Character base from photo stored');
        } catch (err) {
          logger.warn(
            { requestId, characterName: name, err: err instanceof Error ? err.message : String(err) },
            'Character base from photo failed — fallback to original photo'
          );
          try {
            const character = characters.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? characters.find((c) => c.role === 'principal');
            const { buffer, mime } = await readAssetBuffer(refs[0].url);
            if (character) characterBasesByName.set(character.name, { mimeType: mime, base64: buffer.toString('base64') });
          } catch {
            // skip
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // Phase 1.5 — CHARACTER BASE pour les personnages SANS photo (secondaires)
    // Description texte → fiche stylisée verrouillée (même traitement que le principal).
    // ------------------------------------------------------------------
    if (mode === 'consistency' && characters.length > 0) {
      const existingRefs = project.assets.filter((a) => a.type === 'CHARACTER_REF');
      const existingNames = new Set(
        existingRefs
          .map((a) => {
            try {
              const m = JSON.parse(a.metadata || '{}') as { characterName?: string };
              return m.characterName?.trim().toLowerCase();
            } catch {
              return null;
            }
          })
          .filter(Boolean) as string[]
      );

      for (const character of characters) {
        const nameKey = character.name.trim().toLowerCase();
        if (characterBasesByName.has(character.name) || existingNames.has(nameKey)) {
          if (!characterBasesByName.has(character.name)) {
            const refAsset = existingRefs.find((a) => {
              try {
                const m = JSON.parse(a.metadata || '{}') as { characterName?: string };
                return m.characterName?.trim().toLowerCase() === nameKey;
              } catch {
                return false;
              }
            });
            if (refAsset) {
              const { buffer, mime } = await readAssetBuffer(refAsset.url);
              characterBasesByName.set(character.name, { mimeType: mime, base64: buffer.toString('base64') });
            }
          }
          continue;
        }
        if (!character.visualDescription?.trim()) continue;

        try {
          const basePrompt = getCharacterBaseFromDescriptionPrompt(
            character,
            style.visualStyle,
            style.format as 'carre' | 'portrait' | 'paysage'
          );

          let baseBuffer = await generateImageWithProvider(imageProvider, {
            prompt: basePrompt,
            referenceImages: [],
            mode: 'fast',
            aspectRatio: formatToAspectRatio(style.format),
            requestId,
          });

          try {
            const compressed = await compressImageBuffer(baseBuffer, 'image/png');
            baseBuffer = compressed.buffer;
          } catch {
            // keep original
          }

          const key = `projects/${projectId}/character-base-${character.name.replace(/\s+/g, '-').toLowerCase()}-${v4()}.png`;
          await getStorage().upload(key, baseBuffer, 'image/png');
          await prisma.asset.create({
            data: {
              projectId,
              type: 'CHARACTER_REF',
              url: key,
              metadata: JSON.stringify({ characterName: character.name, phase: 'character_base_from_description' }),
            },
          });

          characterBasesByName.set(character.name, { mimeType: 'image/png', base64: baseBuffer.toString('base64') });
          logger.info({ requestId, characterName: character.name }, 'Character base from description (secondary) stored');
        } catch (err) {
          logger.warn(
            { requestId, characterName: character.name, err: err instanceof Error ? err.message : String(err) },
            'Character base from description failed — character will use text description in scenes'
          );
        }
      }
    }

    // Ordre des refs = ordre des personnages dans l'histoire (reference image 1 = characters[0], etc.)
    const charactersWithRefs: StoryCharacter[] = [];
    const characterRefImages: Array<{ mimeType: string; base64: string }> = [];
    if (characters.length > 0) {
      for (const c of characters) {
        const ref = characterBasesByName.get(c.name);
        if (ref) {
          charactersWithRefs.push(c);
          characterRefImages.push(ref);
        }
      }
    }
    const hasCharacterRefImages = characterRefImages.length > 0;

    // ------------------------------------------------------------------
    // Phase 2 — Génération des scènes
    //
    // Stratégie :
    //   - Si character base disponible → prompt minimal (pas de re-description)
    //   - Sinon → fallback textuel
    //   - Les character base images sont passées comme referenceImages
    // ------------------------------------------------------------------
    const job = await prisma.generationJob.create({
      data: {
        projectId,
        type: 'ILLUSTRATIONS',
        status: 'running',
        progress: 0,
        requestId,
      },
    });

    const storage = getStorage();
    const total = project.story.scenes.length;
    let done = 0;

    const bookContext: BookContext = {
      title: project.title || 'Histoire',
      mood: settings.theme?.mood,
    };

    logger.info(
      { requestId, hasCharacterRefImages, refImagesCount: characterRefImages.length, sceneCount: total },
      'Phase 2: generating scene illustrations'
    );

    try {
      for (const scene of project.story.scenes) {
        const prompt = getSceneIllustrationPrompt(
          scene.imagePrompt || scene.text.slice(0, 300),
          characterDescriptor,
          style.visualStyle,
          style.format as 'carre' | 'portrait' | 'paysage',
          style.resemblanceLevel ?? 80,
          bookContext,
          hasCharacterRefImages ? (charactersWithRefs.length > 0 ? charactersWithRefs : null) : (characters.length > 0 ? characters : null),
          (scene as { outfitContext?: string | null }).outfitContext ?? null,
          hasCharacterRefImages
        );

        // Quand on a des personnages verrouillés, on utilise TOUJOURS les refs (même histoire longue) pour cohérence maximale.
        const useRefs = characterRefImages.length > 0;
        const effectiveMode = useRefs ? 'consistency' : mode;

        let buffer = await generateImageWithProvider(imageProvider, {
          prompt,
          referenceImages: useRefs ? characterRefImages : undefined,
          mode: effectiveMode,
          aspectRatio: formatToAspectRatio(style.format),
          requestId,
        });

        try {
          const compressed = await compressImageBuffer(buffer, 'image/png');
          buffer = compressed.buffer;
        } catch {
          // keep original if compression fails
        }

        const key = `projects/${projectId}/illus-${scene.id}-${v4()}.png`;
        await storage.upload(key, buffer, 'image/png');
        const asset = await prisma.asset.create({
          data: {
            projectId,
            type: 'ILLUSTRATION',
            url: key,
            metadata: JSON.stringify({ sceneId: scene.id }),
          },
        });
        await prisma.scene.update({
          where: { id: scene.id },
          data: { illustrationAssetId: asset.id },
        });
        done++;
        await prisma.generationJob.update({
          where: { id: job.id },
          data: { progress: Math.round((done / total) * 100) },
        });
      }

      await prisma.generationJob.update({
        where: { id: job.id },
        data: { status: 'completed', progress: 100 },
      });

      return NextResponse.json({
        jobId: job.id,
        status: 'completed',
        scenesIllustrated: total,
        characterBasesGenerated: hasCharacterRefImages ? characterRefImages.length : 0,
      });
    } catch (e) {
      const message = getGeminiUserMessage(e) ?? (e instanceof Error ? e.message : 'Erreur génération');
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: message, progress: done },
      });
      return NextResponse.json(
        { error: message, jobId: job.id, requestId },
        { status: 500 }
      );
    }
  });
}
