import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { join } from 'path';
import { readFile } from 'fs/promises';
import type { ProjectSettings } from '@/lib/schemas';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MM_TO_PT = 2.834645669;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const projectId = (await params).id;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { story: true, assets: true },
  });
  if (!project?.story) {
    return NextResponse.json({ error: 'Projet ou histoire introuvable' }, { status: 404 });
  }

  const settings = JSON.parse(project.settings || '{}') as ProjectSettings;
  const formatId = settings.bookFormat?.formatId ?? 'a4';
  const bleedMm = settings.bookFormat?.bleedMm ?? 3;
  const formats: Record<string, [number, number]> = {
    a4: [210, 297],
    a5: [148, 210],
    'us-letter': [215.9, 279.4],
    '8x8': [203.2, 203.2],
    '6x9': [152.4, 228.6],
    '8.5x8.5': [215.9, 215.9],
  };
  const [wMm, hMm] = formats[formatId] || [210, 297];
  const pageCount = 24;
  const spineMm = Math.max(2, (pageCount / 2) * 0.05 * 210);
  const wrapWidthPt = (wMm * 2 + spineMm + bleedMm * 4) * MM_TO_PT;
  const wrapHeightPt = (hMm + bleedMm * 2) * MM_TO_PT;

  const coverCandidates = project.assets.filter((a) => a.type === 'COVER_IMAGE');
  const coverAsset = project.selectedCoverAssetId
    ? coverCandidates.find((a) => a.id === project.selectedCoverAssetId) ?? coverCandidates[0]
    : coverCandidates[0];
  const backSynopsis = project.story.backCoverSynopsis || '';

  if (!coverAsset) {
    return NextResponse.json(
      { error: 'Générez d\'abord la couverture depuis le projet (section Couverture et 4e de couverture).' },
      { status: 400 }
    );
  }
  if (!backSynopsis.trim()) {
    return NextResponse.json(
      { error: 'Générez d\'abord la 4e de couverture depuis le projet (section Couverture et 4e de couverture).' },
      { status: 400 }
    );
  }

  const frontCoverX = (wMm + spineMm + bleedMm * 2) * MM_TO_PT;
  const frontCoverW = (wMm + bleedMm * 2) * MM_TO_PT;

  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([wrapWidthPt, wrapHeightPt]);

  try {
    const imgBuffer = await readFile(join(UPLOAD_DIR, coverAsset.url));
    const image = coverAsset.url.endsWith('.png')
      ? await pdfDoc.embedPng(imgBuffer)
      : await pdfDoc.embedJpg(imgBuffer);
    const scale = Math.max(frontCoverW / image.width, wrapHeightPt / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    page.drawImage(image, {
      x: frontCoverX + (frontCoverW - drawW) / 2,
      y: (wrapHeightPt - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Impossible de charger l\'image de couverture.' },
      { status: 500 }
    );
  }

  const { StandardFonts, rgb } = await import('pdf-lib');
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const backX = bleedMm * MM_TO_PT + 15;
  const backW = wMm * MM_TO_PT - 30;
  const lines: string[] = [];
  const words = backSynopsis.slice(0, 800).split(/\s+/);
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(next, 10) > backW) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  let yBack = wrapHeightPt - 30;
  for (const line of lines.slice(0, 25)) {
    page.drawText(line, { x: backX, y: yBack, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    yBack -= 13;
  }

  const pdfBytes = await pdfDoc.save();
  const exportKey = `exports/${projectId}/cover-wrap-${Date.now()}.pdf`;
  const { getStorage } = await import('@/server/storage');
  await getStorage().upload(exportKey, Buffer.from(pdfBytes), 'application/pdf');

  await prisma.exportFile.create({
    data: {
      projectId,
      type: 'cover_wrap_pdf',
      url: exportKey,
      metadata: JSON.stringify({ formatId, spineMm }),
    },
  });

  return NextResponse.json({
    url: exportKey,
    downloadUrl: `/api/files/${encodeURIComponent(exportKey)}`,
  });
}
