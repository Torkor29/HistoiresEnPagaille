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
  const pageWidthPt = (wMm + bleedMm * 2) * MM_TO_PT;
  const pageHeightPt = (hMm + bleedMm * 2) * MM_TO_PT;

  const coverCandidates = project.assets.filter((a) => a.type === 'COVER_IMAGE');
  const coverAsset = project.selectedCoverAssetId
    ? coverCandidates.find((a) => a.id === project.selectedCoverAssetId) ?? coverCandidates[0]
    : coverCandidates[0];
  const backSynopsis = project.story.backCoverSynopsis || '';
  const bookTitle =
    project.story.coverTitle ||
    project.title ||
    (() => {
      try {
        const s = JSON.parse(project.story.synopsis || '{}') as { title?: string };
        return s.title || 'Sans titre';
      } catch {
        return 'Sans titre';
      }
    })();

  if (!backSynopsis.trim()) {
    return NextResponse.json(
      {
        error:
          "Générez d'abord la 4e de couverture depuis le projet (section Couverture et 4e de couverture).",
      },
      { status: 400 }
    );
  }

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  const marginPt = 28;
  const contentW = pageWidthPt - marginPt * 2;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Fond discret façon couverture : image en arrière-plan très atténuée (optionnel)
  if (coverAsset) {
    try {
      const imgBuffer = await readFile(join(UPLOAD_DIR, coverAsset.url));
      const image = coverAsset.url.endsWith('.png')
        ? await pdfDoc.embedPng(imgBuffer)
        : await pdfDoc.embedJpg(imgBuffer);
      const scale = Math.max(pageWidthPt / image.width, pageHeightPt / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidthPt,
        height: pageHeightPt,
        color: rgb(0.98, 0.97, 0.95),
      });
      page.drawImage(image, {
        x: (pageWidthPt - drawW) / 2,
        y: (pageHeightPt - drawH) / 2,
        width: drawW,
        height: drawH,
        opacity: 0.12,
      });
    } catch {
      // fond uni si image indisponible
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidthPt,
        height: pageHeightPt,
        color: rgb(0.98, 0.97, 0.95),
      });
    }
  } else {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidthPt,
      height: pageHeightPt,
      color: rgb(0.98, 0.97, 0.95),
    });
  }

  // Titre du livre en haut (cohérent avec la couverture)
  let y = pageHeightPt - marginPt;
  const titleSize = 14;
  const titleLines = wrapText(bookTitle, fontBold, titleSize, contentW);
  for (const line of titleLines.slice(0, 2)) {
    page.drawText(line, {
      x: marginPt,
      y,
      size: titleSize,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.2),
    });
    y -= titleSize * 1.3;
  }
  y -= 12;

  // Synopsis : découpage en lignes
  const bodySize = 10;
  const words = backSynopsis.slice(0, 1200).split(/\s+/);
  const synopsisLines: string[] = [];
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(next, bodySize) > contentW) {
      if (current) synopsisLines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) synopsisLines.push(current);

  const lineHeight = 13;
  for (const line of synopsisLines) {
    if (y < marginPt + lineHeight) break;
    page.drawText(line, {
      x: marginPt,
      y,
      size: bodySize,
      font,
      color: rgb(0.2, 0.2, 0.25),
    });
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  const exportKey = `exports/${projectId}/backcover-${Date.now()}.pdf`;
  const { getStorage } = await import('@/server/storage');
  await getStorage().upload(exportKey, Buffer.from(pdfBytes), 'application/pdf');

  await prisma.exportFile.create({
    data: {
      projectId,
      type: 'backcover_pdf',
      url: exportKey,
      metadata: JSON.stringify({ formatId }),
    },
  });

  return NextResponse.json({
    url: exportKey,
    downloadUrl: `/api/files/${encodeURIComponent(exportKey)}`,
  });
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, size: number) => number },
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}
