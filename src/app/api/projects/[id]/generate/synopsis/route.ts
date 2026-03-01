import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getStoryPlannerPrompt } from '@/lib/prompts/story-planner';
import { generateSynopsis } from '@/server/services/gemini-text';
import { getGeminiUserMessage } from '@/server/services/gemini-client';
import { v4 } from 'uuid';
import type { ProjectSettings, SynopsisOutput } from '@/lib/schemas';
import { synopsisOutputSchema } from '@/lib/schemas';

function replaceSynopsisName(synopsis: SynopsisOutput, oldName: string, newName: string): SynopsisOutput {
  if (oldName === newName) return synopsis;
  const re = new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const swap = (s: string | undefined) => s ? s.replace(re, newName) : s;
  return {
    ...synopsis,
    childCharacterName: newName,
    title: swap(synopsis.title) ?? synopsis.title,
    moral: swap(synopsis.moral),
    chapters: synopsis.chapters.map((ch) => ({
      ...ch,
      title: swap(ch.title) ?? ch.title,
      scenes: ch.scenes.map((sc) => ({
        ...sc,
        title: swap(sc.title) ?? sc.title,
        summary: swap(sc.summary) ?? sc.summary,
      })),
    })),
  };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const projectId = (await params).id;
  const requestId = v4();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { story: true },
  });
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  const settings = JSON.parse(project.settings || '{}') as ProjectSettings;
  const { child, theme, ideas } = settings;
  if (!child || !theme) {
    return NextResponse.json(
      { error: 'Profil enfant et thème requis' },
      { status: 400 }
    );
  }

  const job = await prisma.generationJob.create({
    data: {
      projectId,
      type: 'SYNOPSIS',
      status: 'running',
      progress: 0,
      requestId,
    },
  });

  try {
    let synopsisData: SynopsisOutput;
    if (settings.premadeSynopsis) {
      synopsisData = synopsisOutputSchema.parse(JSON.parse(settings.premadeSynopsis));
      const actualName = child.firstName || synopsisData.childCharacterName;
      const oldName = synopsisData.childCharacterName || 'Léo';
      synopsisData = replaceSynopsisName(synopsisData, oldName, actualName);
    } else {
      const { system, user } = getStoryPlannerPrompt(child, theme, ideas);
      synopsisData = await generateSynopsis(system, user, requestId);
    }

    const storyPayload = {
      synopsis: JSON.stringify(synopsisData),
      language: 'fr',
      readingLevel: child.readingLevel,
      coverTitle: synopsisData.title,
    };
    await prisma.story.upsert({
      where: { projectId },
      create: { projectId, ...storyPayload },
      update: storyPayload,
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { title: synopsisData.title },
    });

    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: 'completed', progress: 100 },
    });

    return NextResponse.json({
      jobId: job.id,
      status: 'completed',
      synopsis: synopsisData,
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
}
