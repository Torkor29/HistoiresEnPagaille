import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getStorage } from '@/server/storage';
import { join } from 'path';
import { readFile } from 'fs/promises';
import archiver from 'archiver';
import type { ProjectSettings } from '@/lib/schemas';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const projectId = (await params).id;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      story: { include: { scenes: { include: { illustrationAsset: true } } } },
      assets: true,
    },
  });
  if (!project?.story) {
    return NextResponse.json({ error: 'Projet ou histoire introuvable' }, { status: 404 });
  }

  const settings = JSON.parse(project.settings || '{}') as ProjectSettings;
  const metadata = {
    format: settings.bookFormat?.formatId ?? 'a4',
    bleedMm: settings.bookFormat?.bleedMm ?? 3,
    title: project.story.coverTitle || project.title,
    exportedAt: new Date().toISOString(),
  };

  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on('data', (chunk: Buffer) => chunks.push(chunk));
  archive.on('end', () => {});

  archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
  archive.append(project.story.fullText || '', { name: 'story.txt' });
  if (project.story.synopsis) {
    archive.append(project.story.synopsis, { name: 'synopsis.json' });
  }

  const assetsDir = 'assets';
  const coverCandidates = project.assets.filter((a) => a.type === 'COVER_IMAGE');
  const mainCover = project.selectedCoverAssetId
    ? coverCandidates.find((a) => a.id === project.selectedCoverAssetId) ?? coverCandidates[0]
    : coverCandidates[0];
  const assetsToPack = [
    ...project.assets.filter((a) => a.type === 'ILLUSTRATION'),
    ...(mainCover ? [mainCover] : []),
  ];
  for (const asset of assetsToPack) {
    try {
      const fullPath = join(UPLOAD_DIR, asset.url);
      const buf = await readFile(fullPath);
      const name = asset.url.split('/').pop() || asset.id + '.png';
      archive.append(buf, { name: `${assetsDir}/${name}` });
    } catch {
      // skip missing
    }
  }

  await archive.finalize();
  const zipBuffer = Buffer.concat(chunks);
  const exportKey = `exports/${projectId}/print-pack-${Date.now()}.zip`;
  const storage = getStorage();
  await storage.upload(exportKey, zipBuffer, 'application/zip');

  await prisma.exportFile.create({
    data: {
      projectId,
      type: 'print_pack_zip',
      url: exportKey,
      metadata: JSON.stringify(metadata),
    },
  });

  return NextResponse.json({
    url: exportKey,
    downloadUrl: `/api/files/${encodeURIComponent(exportKey)}`,
  });
}
