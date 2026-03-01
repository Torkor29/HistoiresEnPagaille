import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const { id: projectId, assetId } = await params;
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, projectId },
  });
  if (!asset) return NextResponse.json({ error: 'Asset introuvable' }, { status: 404 });
  await prisma.asset.delete({ where: { id: assetId } });
  return new NextResponse(null, { status: 204 });
}
