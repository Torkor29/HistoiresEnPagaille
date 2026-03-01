import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getStorage } from '@/server/storage';
import { v4 } from 'uuid';

const ALLOWED_TYPES = ['PHOTO_REF', 'ILLUSTRATION', 'COVER_IMAGE', 'CHARACTER_REF'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const projectId = (await params).id;
  const requestId = v4();
  const contentType = req.headers.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');
  let buffer: Buffer;
  let type = 'PHOTO_REF';
  let mimeType = 'image/png';

  if (isMultipart) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const typeParam = formData.get('type') as string | null;
    const characterName = (formData.get('characterName') as string | null)?.trim() || null;
    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    if (typeParam && ALLOWED_TYPES.includes(typeParam)) type = typeParam;
    buffer = Buffer.from(await file.arrayBuffer());
    mimeType = file.type || 'image/png';
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux' }, { status: 413 });
    }
    // Store characterName in metadata for PHOTO_REF / CHARACTER_REF
    const metadataObj = { size: buffer.length, mimeType, ...(characterName ? { characterName } : {}) };
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const key = `projects/${projectId}/${type.toLowerCase()}-${requestId}.${ext}`;
    const storage = getStorage();
    await storage.upload(key, buffer, mimeType);
    const asset = await prisma.asset.create({
      data: {
        projectId,
        type,
        url: key,
        metadata: JSON.stringify(metadataObj),
      },
    });
    return NextResponse.json({
      id: asset.id,
      type: asset.type,
      url: key,
      metadata: metadataObj,
      requestId,
    });
  } else {
    buffer = Buffer.from(await req.arrayBuffer());
    const t = req.nextUrl.searchParams.get('type');
    if (t && ALLOWED_TYPES.includes(t)) type = t;
  }

  if (buffer.length > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux' }, { status: 413 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const key = `projects/${projectId}/${type.toLowerCase()}-${requestId}.${ext}`;
  const storage = getStorage();
  await storage.upload(key, buffer, mimeType);

  const asset = await prisma.asset.create({
    data: {
      projectId,
      type,
      url: key,
      metadata: JSON.stringify({ size: buffer.length, mimeType }),
    },
  });
  return NextResponse.json({
    id: asset.id,
    type: asset.type,
    url: key,
    requestId,
  });
}
