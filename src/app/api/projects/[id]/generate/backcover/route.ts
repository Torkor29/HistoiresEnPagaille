import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { generateBackCoverSynopsis } from '@/server/services/gemini-text';
import { v4 } from 'uuid';

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
  if (!project?.story) {
    return NextResponse.json({ error: 'Projet ou histoire introuvable' }, { status: 404 });
  }
  const fullText = project.story.fullText || '';
  const title = project.story.coverTitle || 'Mon histoire';

  const synopsis = await generateBackCoverSynopsis(
    title,
    fullText,
    project.story.language || 'fr',
    requestId
  );

  await prisma.story.update({
    where: { id: project.story.id },
    data: { backCoverSynopsis: synopsis },
  });

  return NextResponse.json({ backCoverSynopsis: synopsis });
}
