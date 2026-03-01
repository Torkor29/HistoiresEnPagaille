import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { generateLayoutPlan } from '@/server/services/gemini-text';
import { v4 } from 'uuid';
import type { ProjectSettings } from '@/lib/schemas';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const projectId = (await params).id;
  const requestId = v4();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { story: { include: { scenes: { orderBy: { order: 'asc' } } } } },
  });
  if (!project?.story) {
    return NextResponse.json({ error: 'Projet ou histoire introuvable' }, { status: 404 });
  }

  const settings = JSON.parse(project.settings || '{}') as ProjectSettings;
  const duration = settings.theme?.duration || 'moyen';
  const formatId = settings.bookFormat?.formatId || 'a4';
  const formats: Record<string, Record<string, number>> = {
    a4: { short: 12, medium: 20, long: 32 },
    a5: { short: 16, medium: 28, long: 44 },
    'us-letter': { short: 12, medium: 20, long: 32 },
    '8x8': { short: 12, medium: 24, long: 36 },
    '6x9': { short: 20, medium: 36, long: 56 },
    '8.5x8.5': { short: 12, medium: 24, long: 36 },
  };
  const pagesTarget = formats[formatId]?.[duration] ?? 24;

  const scenes = project.story.scenes.map((s) => ({
    id: s.id,
    title: s.title,
    text: s.text,
    hasIllustration: !!s.illustrationAssetId,
  }));

  const plan = await generateLayoutPlan(scenes, pagesTarget, requestId);

  await prisma.story.update({
    where: { id: project.story.id },
    data: { layoutPlan: JSON.stringify(plan) },
  });

  return NextResponse.json(plan);
}
