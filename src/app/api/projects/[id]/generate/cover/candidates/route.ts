import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getStorage } from '@/server/storage';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateImage } from '@/server/services/gemini-image';
import { getCoverIllustrationPrompt, getCharacterDescriptionForScene } from '@/lib/prompts/illustration-director';
import { v4 } from 'uuid';
import type { ProjectSettings, StoryCharacter } from '@/lib/schemas';
import { compressImageBuffer } from '@/server/utils/compress-image';
import { withProjectLock } from '@/server/utils/project-generation-lock';
import type { GeminiAspectRatio } from '@/server/services/gemini-image';

function formatToAspectRatio(w: number, h: number): GeminiAspectRatio {
  if (w > h) return '4:3';
  if (w < h) return '3:4';
  return '1:1';
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const CANDIDATE_COUNT = 3;

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
  const projectId = (await params).id;
  return withProjectLock(projectId, async () => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { story: { include: { scenes: { orderBy: { order: 'asc' } } } }, assets: true },
    });
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    const title = project.story?.coverTitle || project.title || 'Mon histoire';
    const subtitle = project.story?.coverSubtitle || '';
    const settings = JSON.parse(project.settings || '{}') as ProjectSettings;
    const style = settings.style || { visualStyle: 'storybook_pastel' };
    const bookFormat = settings.bookFormat;
    const widthMm = bookFormat?.formatId === 'a4' ? 210 : bookFormat?.formatId === 'a5' ? 148 : 200;
    const heightMm = bookFormat?.formatId === 'a4' ? 297 : bookFormat?.formatId === 'a5' ? 210 : 200;

    let characterDescriptor = 'Enfant, apparence générique.';
    let characters: StoryCharacter[] = [];
    try {
      if (project.story?.characterDescriptors) {
        characters = JSON.parse(project.story.characterDescriptors) as StoryCharacter[];
      }
    } catch {
      // ignore
    }

    // Priorité : CHARACTER_REF (fiches stylisées) > PHOTO_REF
    const characterRefAssets = project.assets.filter((a) => a.type === 'CHARACTER_REF');
    const photoRefs = project.assets.filter((a) => a.type === 'PHOTO_REF');
    const referenceImages: Array<{ mimeType: string; base64: string }> = [];
    let hasCharacterRefImages = false;

    if (characterRefAssets.length > 0) {
      for (const ref of characterRefAssets) {
        try {
          const { buffer, mime } = await readAssetBuffer(ref.url);
          referenceImages.push({ mimeType: mime, base64: buffer.toString('base64') });
        } catch {
          // skip
        }
      }
      hasCharacterRefImages = referenceImages.length > 0;
    } else if (photoRefs.length > 0) {
      try {
        const { generateCharacterDescriptor } = await import('@/server/services/gemini-text');
        const first = await readAssetBuffer(photoRefs[0].url);
        characterDescriptor = await generateCharacterDescriptor(
          first.buffer.toString('base64'),
          first.mime,
          v4()
        );
        const parts = characterDescriptor.split(/\s*\|\s*/);
        if (characters.length > 0) {
          const mainIdx = characters.findIndex((c) => c.role === 'principal');
          if (mainIdx >= 0) {
            characters = [...characters];
            characters[mainIdx] = {
              ...characters[mainIdx],
              visualDescription: parts[0]?.trim() || characterDescriptor,
              defaultOutfit: parts[1]?.trim() || (characters[mainIdx].defaultOutfit ?? undefined),
            };
          }
        }
      } catch {
        // keep generic
      }
    }

    if (!hasCharacterRefImages && characters.length > 0) {
      const main = characters.find((c) => c.role === 'principal');
      if (main) characterDescriptor = getCharacterDescriptionForScene(main, null);
    }

    // Tenue cohérente avec l'histoire (même logique que route cover unique)
    let coverOutfitContext: string | null = null;
    let coverOutfitDescription: string | null = null;
    const scenes = project.story?.scenes ?? [];
    const mainCharacter = characters.find((c) => c.role === 'principal');
    if (mainCharacter && scenes.length > 0) {
      const contextCounts: Record<string, number> = {};
      for (const s of scenes) {
        const ctx = (s as { outfitContext?: string | null }).outfitContext?.trim().toLowerCase();
        if (ctx) contextCounts[ctx] = (contextCounts[ctx] ?? 0) + 1;
      }
      const sorted = Object.entries(contextCounts).sort((a, b) => b[1] - a[1]);
      coverOutfitContext = sorted.length > 0 ? sorted[0][0] : null;
      if (coverOutfitContext) {
        const ctxOutfit = mainCharacter.contextOutfits?.find(
          (o) => o.context.trim().toLowerCase() === coverOutfitContext
        );
        coverOutfitDescription = ctxOutfit?.outfitDescription ?? null;
      }
      if (!coverOutfitDescription && mainCharacter.defaultOutfit) {
        coverOutfitDescription = mainCharacter.defaultOutfit;
      }
    }

    const fullTitle = subtitle ? `${title} — ${subtitle}` : title;
    const storage = getStorage();
    const assetIds: string[] = [];

    for (let i = 0; i < CANDIDATE_COUNT; i++) {
      const requestId = v4();
      const prompt = getCoverIllustrationPrompt(
        fullTitle,
        characterDescriptor,
        style.visualStyle,
        widthMm,
        heightMm,
        hasCharacterRefImages,
        coverOutfitContext,
        coverOutfitDescription
      );
      let buffer = await generateImage({
        prompt,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        mode: hasCharacterRefImages ? 'consistency' : 'fast',
        aspectRatio: formatToAspectRatio(widthMm, heightMm),
        requestId,
      });
      try {
        const compressed = await compressImageBuffer(buffer, 'image/png');
        buffer = compressed.buffer;
      } catch {
        // keep original
      }
      const key = `projects/${projectId}/cover-${v4()}.png`;
      await storage.upload(key, buffer, 'image/png');
      const asset = await prisma.asset.create({
        data: {
          projectId,
          type: 'COVER_IMAGE',
          url: key,
          metadata: JSON.stringify({ title: fullTitle, candidateIndex: i }),
        },
      });
      assetIds.push(asset.id);
    }

    if (project.story) {
      await prisma.story.update({
        where: { id: project.story.id },
        data: { coverTitle: title, coverSubtitle: subtitle || undefined },
      });
    }

    return NextResponse.json({ assetIds });
  });
}
