import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';

/** Corps attendu : { illustrationCorrection: { type: 'tenue'|'coupe'|'autre', detail: string } | null } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sceneId = (await params).id;
  const body = await req.json().catch(() => ({}));

  const scene = await prisma.scene.findFirst({
    where: { id: sceneId },
    include: { story: { select: { projectId: true } } },
  });
  if (!scene) return NextResponse.json({ error: 'Scène introuvable' }, { status: 404 });

  let illustrationCorrection: string | null = null;
  if (body.illustrationCorrection !== undefined) {
    if (body.illustrationCorrection === null) {
      illustrationCorrection = null;
    } else if (
      typeof body.illustrationCorrection === 'object' &&
      typeof body.illustrationCorrection.detail === 'string'
    ) {
      const type = ['tenue', 'coupe', 'autre'].includes(body.illustrationCorrection.type)
        ? body.illustrationCorrection.type
        : 'autre';
      illustrationCorrection = JSON.stringify({
        type,
        detail: body.illustrationCorrection.detail.trim(),
      });
    }
  }

  await prisma.scene.update({
    where: { id: sceneId },
    data: { illustrationCorrection },
  });

  return NextResponse.json({ ok: true, sceneId });
}
