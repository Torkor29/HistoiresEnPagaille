import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { randomBytes } from 'crypto';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  const token = randomBytes(16).toString('base64url');
  await prisma.project.update({
    where: { id },
    data: { shareToken: token },
  });

  return NextResponse.json({ shareToken: token });
}
