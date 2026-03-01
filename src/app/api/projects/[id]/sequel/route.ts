import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { generateSequelSynopsis } from '@/server/services/gemini-text';
import { getGeminiUserMessage } from '@/server/services/gemini-client';
import { v4 } from 'uuid';
import { synopsisOutputSchema } from '@/lib/schemas';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const projectId = (await params).id;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { story: true },
  });
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
  if (!project.story?.synopsis) {
    return NextResponse.json(
      { error: 'Ce projet n\'a pas encore de synopsis ou d\'histoire' },
      { status: 400 }
    );
  }

  const requestId = v4();
  const previousSynopsis = project.story.synopsis;
  const previousFullText = project.story.fullText || previousSynopsis;

  let sequelSynopsis: unknown;
  try {
    sequelSynopsis = await generateSequelSynopsis(
      previousSynopsis,
      previousFullText,
      requestId
    );
  } catch (e) {
    const message = getGeminiUserMessage(e) ?? (e instanceof Error ? e.message : 'Erreur génération');
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const parsed = synopsisOutputSchema.safeParse(sequelSynopsis);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Format du synopsis suite invalide' },
      { status: 500 }
    );
  }

  const baseTitle = project.story.coverTitle || project.title;
  const sequelTitle = baseTitle.includes('(tome 2)') ? `${baseTitle} — suite` : `${baseTitle} (tome 2)`;

  const newProject = await prisma.project.create({
    data: {
      title: sequelTitle,
      settings: project.settings,
    },
  });

  await prisma.story.create({
    data: {
      projectId: newProject.id,
      language: 'fr',
      readingLevel: project.story.readingLevel,
      synopsis: JSON.stringify(parsed.data),
      coverTitle: parsed.data.title,
    },
  });

  return NextResponse.json(
    { id: newProject.id, title: newProject.title },
    { status: 201 }
  );
}
