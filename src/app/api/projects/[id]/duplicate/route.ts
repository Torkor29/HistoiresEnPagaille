import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getStorage } from '@/server/storage';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { v4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      story: {
        include: {
          scenes: { orderBy: { order: 'asc' } },
        },
      },
      assets: true,
    },
  });
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  const newProject = await prisma.project.create({
    data: {
      title: `${project.title} (copie)`,
      settings: project.settings,
    },
  });

  const assetIdMap = new Map<string, string>();

  for (const asset of project.assets) {
    try {
      const buffer = await readFile(join(UPLOAD_DIR, asset.url));
      const ext = asset.url.includes('.png') ? 'png' : 'jpg';
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      const newKey = `projects/${newProject.id}/${asset.type}-${v4()}.${ext}`;
      await getStorage().upload(newKey, buffer, mime);
      const newAsset = await prisma.asset.create({
        data: {
          projectId: newProject.id,
          type: asset.type,
          url: newKey,
          metadata: asset.metadata,
        },
      });
      assetIdMap.set(asset.id, newAsset.id);
    } catch {
      // skip asset if file missing
    }
  }

  if (project.story) {
    const newStory = await prisma.story.create({
      data: {
        projectId: newProject.id,
        language: project.story.language,
        readingLevel: project.story.readingLevel,
        fullText: project.story.fullText,
        synopsis: project.story.synopsis,
        safetyNotes: project.story.safetyNotes,
        coverTitle: project.story.coverTitle,
        coverSubtitle: project.story.coverSubtitle,
        backCoverSynopsis: project.story.backCoverSynopsis,
        backCoverBio: project.story.backCoverBio,
        layoutPlan: project.story.layoutPlan,
        characterDescriptors: project.story.characterDescriptors,
      },
    });

    for (const scene of project.story.scenes) {
      const newIllustrationAssetId = scene.illustrationAssetId
        ? assetIdMap.get(scene.illustrationAssetId) ?? null
        : null;
      await prisma.scene.create({
        data: {
          storyId: newStory.id,
          order: scene.order,
          title: scene.title,
          text: scene.text,
          imagePrompt: scene.imagePrompt,
          outfitContext: scene.outfitContext,
          illustrationAssetId: newIllustrationAssetId,
          regenCount: scene.regenCount,
        },
      });
    }
  }

  return NextResponse.json({ id: newProject.id, title: newProject.title }, { status: 201 });
}
