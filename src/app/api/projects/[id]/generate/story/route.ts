import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getStoryWriterPrompt } from '@/lib/prompts/story-writer';
import { generateStory } from '@/server/services/gemini-text';
import { getGeminiUserMessage } from '@/server/services/gemini-client';
import { synopsisOutputSchema } from '@/lib/schemas';
import { v4 } from 'uuid';
import type { ProjectSettings } from '@/lib/schemas';
import { withProjectLock } from '@/server/utils/project-generation-lock';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const projectId = (await params).id;
  return withProjectLock(projectId, async () => {
  const requestId = v4();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { story: true },
  });
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
  if (!project.story?.synopsis) {
    return NextResponse.json(
      { error: 'Générer d\'abord le synopsis' },
      { status: 400 }
    );
  }

  const settings = JSON.parse(project.settings || '{}') as ProjectSettings;
  const synopsis = synopsisOutputSchema.parse(JSON.parse(project.story.synopsis));
  const { system, user } = getStoryWriterPrompt(
    settings.child!,
    settings.theme!,
    settings.style,
    synopsis,
    settings.ideas
  );

  const job = await prisma.generationJob.create({
    data: {
      projectId,
      type: 'STORY',
      status: 'running',
      progress: 0,
      requestId,
    },
  });

  try {
    const result = await generateStory(system, user, requestId);

    await prisma.scene.deleteMany({ where: { storyId: project.story.id } });
    for (const scene of result.scenes) {
      await prisma.scene.create({
        data: {
          storyId: project.story.id,
          order: scene.order,
          title: scene.title,
          text: scene.text,
          imagePrompt: scene.imagePrompt,
          outfitContext: scene.outfitContext ?? null,
        },
      });
    }
    await prisma.story.update({
      where: { id: project.story.id },
      data: {
        fullText: result.fullText,
        characterDescriptors: JSON.stringify(result.characters ?? []),
      },
    });
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: 'completed', progress: 100 },
    });

    return NextResponse.json({
      jobId: job.id,
      status: 'completed',
      fullText: result.fullText,
      scenesCount: result.scenes.length,
    });
  } catch (e) {
    const message = getGeminiUserMessage(e) ?? (e instanceof Error ? e.message : 'Erreur génération');
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: message },
    });
    return NextResponse.json(
      { error: message, jobId: job.id, requestId },
      { status: 500 }
    );
  }
  });
}
