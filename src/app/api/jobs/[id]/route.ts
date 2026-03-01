import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const job = await prisma.generationJob.findUnique({
    where: { id },
  });
  if (!job) return NextResponse.json({ error: 'Job introuvable' }, { status: 404 });
  return NextResponse.json({
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    error: job.error,
  });
}
