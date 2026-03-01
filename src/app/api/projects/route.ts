import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { v4 } from 'uuid';

export async function POST(req: NextRequest) {
  const requestId = v4();
  try {
    const body = await req.json().catch(() => ({}));
    const settings = body.settings != null ? body.settings : {};
    const title = typeof body.title === 'string' ? body.title : 'Sans titre';
    const project = await prisma.project.create({
      data: {
        title,
        settings: JSON.stringify(settings),
      },
    });
    return NextResponse.json({ id: project.id, title: project.title }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: message, requestId },
      { status: 400 }
    );
  }
}

export async function GET() {
  const list = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(list);
}
