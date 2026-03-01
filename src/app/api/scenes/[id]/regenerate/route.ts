import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getStorage } from '@/server/storage';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateImageWithProvider } from '@/server/services/image-providers';
import type { ImageProviderId } from '@/server/services/image-providers';
import { getSceneIllustrationPrompt, type BookContext } from '@/lib/prompts/illustration-director';
import { v4 } from 'uuid';
import type { ProjectSettings, StoryCharacter } from '@/lib/schemas';
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
const VALID_PROVIDERS: ImageProviderId[] = ['gemini', 'replicate', 'local'];

async function readAssetBuffer(url: string): Promise<{ buffer: Buffer; mime: string }> {
  const fullPath = join(UPLOAD_DIR, url);
  const buffer = await readFile(fullPath);
  const mime = url.endsWith('.jpg') || url.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
  return { buffer, mime };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sceneId = (await params).id;
  const requestId = v4();
  const body = await req.json().catch(() => ({}));
  const imageProvider: ImageProviderId = VALID_PROVIDERS.includes(body.imageProvider)
    ? body.imageProvider
    : 'gemini';

  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    include: {
      story: { include: { project: { include: { assets: true } } } },
    },
  });
  if (!scene?.story) return NextResponse.json({ error: 'Scène introuvable' }, { status: 404 });

  const project = scene.story.project;
  const settings = JSON.parse(project.settings || '{}') as ProjectSettings;
  const style = settings.style || {
    visualStyle: 'storybook_pastel',
    format: 'portrait',
    resemblanceLevel: 80,
  };

  let characterDescriptor = 'Enfant, apparence générique.';
  let characters: StoryCharacter[] = [];
  try {
    if (scene.story.characterDescriptors) {
      characters = JSON.parse(scene.story.characterDescriptors) as StoryCharacter[];
    }
  } catch {
    // ignore
  }

  // Stratégie d'identité persistante : CHARACTER_REF en priorité, ordre = ordre des personnages du récit.
  const characterRefAssets = project.assets.filter((a) => a.type === 'CHARACTER_REF');
  const photoRefs = project.assets.filter((a) => a.type === 'PHOTO_REF');
  const referenceImages: Array<{ mimeType: string; base64: string }> = [];
  let charactersWithRefs: StoryCharacter[] = [];
  let hasCharacterRefImages = false;

  if (characterRefAssets.length > 0 && characters.length > 0) {
    const refByCharacterName = new Map<string, { mimeType: string; base64: string }>();
    for (const ref of characterRefAssets) {
      try {
        const meta = ref.metadata ? (JSON.parse(ref.metadata) as { characterName?: string }) : {};
        const name = meta.characterName?.trim();
        if (!name) continue;
        const { buffer, mime } = await readAssetBuffer(ref.url);
        refByCharacterName.set(name.toLowerCase(), { mimeType: mime, base64: buffer.toString('base64') });
      } catch {
        // skip
      }
    }
    for (const c of characters) {
      const ref = refByCharacterName.get(c.name.trim().toLowerCase());
      if (ref) {
        charactersWithRefs.push(c);
        referenceImages.push(ref);
      }
    }
    hasCharacterRefImages = referenceImages.length > 0;
  }
  if (!hasCharacterRefImages && photoRefs.length > 0) {
    // Fallback : photos originales + descripteur textuel
    try {
      for (const ref of photoRefs.slice(0, 2)) {
        const { buffer, mime } = await readAssetBuffer(ref.url);
        referenceImages.push({ mimeType: mime, base64: buffer.toString('base64') });
      }
      if (referenceImages.length > 0) {
        const { generateCharacterDescriptor } = await import('@/server/services/gemini-text');
        const fullDescriptor = await generateCharacterDescriptor(
          referenceImages[0].base64,
          referenceImages[0].mimeType,
          requestId
        );
        characterDescriptor = fullDescriptor;
        const parts = fullDescriptor.split(/\s*\|\s*/);
        if (characters.length > 0) {
          const mainIdx = characters.findIndex((c) => c.role === 'principal');
          if (mainIdx >= 0) {
            characters = [...characters];
            characters[mainIdx] = {
              ...characters[mainIdx],
              visualDescription: parts[0]?.trim() || fullDescriptor,
              defaultOutfit: parts[1]?.trim() || (characters[mainIdx].defaultOutfit ?? undefined),
            };
          }
        }
      }
    } catch {
      // keep generic
    }
  }

  const bookContext: BookContext = {
    title: project.title || 'Histoire',
    mood: settings.theme?.mood,
  };

  let userCorrection: string | null = null;
  if (scene.illustrationCorrection) {
    try {
      const parsed = JSON.parse(scene.illustrationCorrection) as { type?: string; detail?: string };
      const detail = (parsed.detail ?? '').trim();
      if (detail) {
        const typeLabel =
          parsed.type === 'tenue'
            ? 'Tenue'
            : parsed.type === 'coupe'
              ? 'Coupe de cheveux / perruque'
              : 'Correction';
        userCorrection = `${typeLabel}: ${detail}`;
      }
    } catch {
      userCorrection = scene.illustrationCorrection;
    }
  }

  const prompt = getSceneIllustrationPrompt(
    scene.imagePrompt || scene.text.slice(0, 300),
    characterDescriptor,
    style.visualStyle,
    (style.format as 'carre' | 'portrait' | 'paysage') || 'portrait',
    style.resemblanceLevel ?? 80,
    bookContext,
    hasCharacterRefImages && charactersWithRefs.length > 0 ? charactersWithRefs : (characters.length > 0 ? characters : null),
    scene.outfitContext ?? null,
    hasCharacterRefImages,
    userCorrection
  );

  const buffer = await generateImageWithProvider(imageProvider, {
    prompt,
    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
    mode: 'consistency',
    aspectRatio: formatToAspectRatio(style.format),
    requestId,
  });

  const storage = getStorage();
  const key = `projects/${project.id}/illus-${sceneId}-${v4()}.png`;
  await storage.upload(key, buffer, 'image/png');

  const asset = await prisma.asset.create({
    data: {
      projectId: project.id,
      type: 'ILLUSTRATION',
      url: key,
      metadata: JSON.stringify({ sceneId }),
    },
  });

  await prisma.scene.update({
    where: { id: sceneId },
    data: {
      illustrationAssetId: asset.id,
      regenCount: { increment: 1 },
    },
  });

  return NextResponse.json({
    sceneId,
    assetId: asset.id,
    url: key,
  });
}
