import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assets: { select: { id: true, type: true, url: true, metadata: true } },
      story: {
        include: {
          scenes: {
            orderBy: { order: 'asc' },
            include: { illustrationAsset: { select: { id: true, url: true } } },
          },
        },
      },
      jobs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
  const settings = JSON.parse(project.settings || '{}');
  return NextResponse.json({
    ...project,
    settings,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const body = await req.json().catch(() => ({}));
  const data: { title?: string; settings?: string; selectedCoverAssetId?: string | null } = {};
  if (typeof body.title === 'string') data.title = body.title;
  if (body.settings != null) data.settings = JSON.stringify(body.settings);
  if (body.selectedCoverAssetId !== undefined) {
    if (body.selectedCoverAssetId === null || body.selectedCoverAssetId === '') {
      data.selectedCoverAssetId = null;
    } else {
      const asset = await prisma.asset.findFirst({
        where: { id: body.selectedCoverAssetId, projectId: id, type: 'COVER_IMAGE' },
      });
      if (!asset) return NextResponse.json({ error: 'Asset couverture invalide' }, { status: 400 });
      data.selectedCoverAssetId = asset.id;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 });
  }
  const project = await prisma.project.update({
    where: { id },
    data,
  });
  return NextResponse.json(project);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  await prisma.project.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
