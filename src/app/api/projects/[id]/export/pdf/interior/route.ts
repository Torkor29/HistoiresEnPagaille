import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getPageSpec, buildPagesFromLayout } from '@/server/pdf/layout-engine';
import type { BookLayoutPlan, ProjectSettings } from '@/lib/schemas';
import { join } from 'path';
import { readFile } from 'fs/promises';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const projectId = (await params).id;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      story: {
        include: {
          scenes: { orderBy: { order: 'asc' }, include: { illustrationAsset: true } },
        },
      },
      assets: true,
    },
  });
  if (!project?.story) {
    return NextResponse.json({ error: 'Projet ou histoire introuvable' }, { status: 404 });
  }

  const settings = JSON.parse(project.settings || '{}') as ProjectSettings;
  const formatId = settings.bookFormat?.formatId ?? 'a4';
  const bleedMm = settings.bookFormat?.bleedMm ?? 3;
  const safeMarginMm = settings.bookFormat?.safeMarginMm ?? 5;
  const spec = getPageSpec(formatId, bleedMm, safeMarginMm);

  // Format imprimable par défaut : une page TEXTE puis une page ILLUSTRATION par scène (texte à gauche, illu à droite en livre ouvert)
  let layoutPlan: BookLayoutPlan;
  if (project.story.layoutPlan) {
    layoutPlan = JSON.parse(project.story.layoutPlan) as BookLayoutPlan;
  } else {
    const pages: BookLayoutPlan['pages'] = [];
    let pageNum = 1;
    for (const s of project.story.scenes) {
      pages.push({
        pageNumber: pageNum++,
        type: 'TEXTE',
        sceneId: s.id,
        textContent: s.text,
      });
      pages.push({
        pageNumber: pageNum++,
        type: 'ILLUSTRATION_PLEINE_PAGE',
        sceneId: s.id,
        illustrationAssetId: s.illustrationAssetId,
      });
    }
    layoutPlan = { pages };
  }

  const sceneTexts = new Map(project.story.scenes.map((s) => [s.id, s.text]));
  const sceneTitles = new Map(project.story.scenes.map((s) => [s.id, s.title ?? '']));
  const sceneIllustrationUrls = new Map(
    project.story.scenes.map((s) => [
      s.id,
      s.illustrationAsset ? s.illustrationAsset.url : null,
    ])
  );

  const pages = buildPagesFromLayout(
    layoutPlan,
    sceneTexts,
    sceneIllustrationUrls
  );

  const title = project.story.coverTitle || project.title;

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = spec.marginPt;
  const bleedPt = spec.bleedPt ?? 0;
  const lineHeight = 14;
  const fontSize = 12;
  const titleFontSize = 16;

  function drawCropMarks(
    page: {
      drawLine: (opts: {
        start: { x: number; y: number };
        end: { x: number; y: number };
        thickness: number;
        // pdf-lib accepte plusieurs formats de couleur, on assouplit ici
        color?: any;
      }) => void;
    }
  ) {
    const trimInset = bleedPt;
    const markLen = 10;
    const gray = rgb(0.6, 0.6, 0.6);
    page.drawLine({
      start: { x: trimInset, y: spec.heightPt - trimInset },
      end: { x: trimInset, y: spec.heightPt - trimInset - markLen },
      thickness: 0.5,
      color: gray,
    });
    page.drawLine({
      start: { x: trimInset, y: spec.heightPt - trimInset },
      end: { x: trimInset + markLen, y: spec.heightPt - trimInset },
      thickness: 0.5,
      color: gray,
    });
    page.drawLine({
      start: { x: spec.widthPt - trimInset, y: spec.heightPt - trimInset },
      end: { x: spec.widthPt - trimInset - markLen, y: spec.heightPt - trimInset },
      thickness: 0.5,
      color: gray,
    });
    page.drawLine({
      start: { x: spec.widthPt - trimInset, y: spec.heightPt - trimInset },
      end: { x: spec.widthPt - trimInset, y: spec.heightPt - trimInset - markLen },
      thickness: 0.5,
      color: gray,
    });
    page.drawLine({
      start: { x: trimInset, y: trimInset },
      end: { x: trimInset + markLen, y: trimInset },
      thickness: 0.5,
      color: gray,
    });
    page.drawLine({
      start: { x: trimInset, y: trimInset },
      end: { x: trimInset, y: trimInset + markLen },
      thickness: 0.5,
      color: gray,
    });
    page.drawLine({
      start: { x: spec.widthPt - trimInset, y: trimInset },
      end: { x: spec.widthPt - trimInset - markLen, y: trimInset },
      thickness: 0.5,
      color: gray,
    });
    page.drawLine({
      start: { x: spec.widthPt - trimInset, y: trimInset },
      end: { x: spec.widthPt - trimInset, y: trimInset + markLen },
      thickness: 0.5,
      color: gray,
    });
  }

  const coverCandidates = project.assets?.filter((a) => a.type === 'COVER_IMAGE') ?? [];
  const coverAssetForPdf = project.selectedCoverAssetId
    ? coverCandidates.find((a) => a.id === project.selectedCoverAssetId) ?? coverCandidates[0]
    : coverCandidates[0];

  for (let i = 0; i < pages.length + 1; i++) {
    const page = pdfDoc.addPage([spec.widthPt, spec.heightPt]);
    const isCoverPage = i === 0;

    if (isCoverPage) {
      if (coverAssetForPdf) {
        try {
          const fullPath = join(UPLOAD_DIR, coverAssetForPdf.url);
          const imgBuffer = await readFile(fullPath);
          const image = coverAssetForPdf.url.endsWith('.png')
            ? await pdfDoc.embedPng(imgBuffer)
            : await pdfDoc.embedJpg(imgBuffer);
          const contentW = spec.widthPt - 2 * bleedPt;
          const contentH = spec.heightPt - 2 * bleedPt;
          const scale = Math.max(contentW / image.width, contentH / image.height);
          const imgW = image.width * scale;
          const imgH = image.height * scale;
          page.drawImage(image, {
            x: (spec.widthPt - imgW) / 2,
            y: (spec.heightPt - imgH) / 2,
            width: imgW,
            height: imgH,
          });
        } catch {
          // fallback: titre centré si pas d'image
        }
      }
      if (!coverAssetForPdf || title) {
        const titleLines = title.length > 50 ? [title.slice(0, 50) + '…', title.slice(50)] : [title];
        let yTitle = spec.heightPt - spec.safeMarginPt - titleFontSize;
        for (const line of titleLines) {
          const tw = boldFont.widthOfTextAtSize(line, titleFontSize);
          page.drawText(line, {
            x: (spec.widthPt - tw) / 2,
            y: yTitle,
            size: titleFontSize,
            font: boldFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          yTitle -= titleFontSize + 4;
        }
      }
      drawCropMarks(page);
      continue;
    }

    const pg = pages[i - 1];
    let y = spec.heightPt - margin;

    const sceneTitle = pg.sceneId ? sceneTitles.get(pg.sceneId) : undefined;
    const imageAreaHeightPt = spec.heightPt * 0.55;

    if (pg.type === 'MIXTE' && pg.illustrationUrl) {
      try {
        const fullPath = join(UPLOAD_DIR, pg.illustrationUrl);
        const imgBuffer = await readFile(fullPath);
        const image = pg.illustrationUrl.endsWith('.png')
          ? await pdfDoc.embedPng(imgBuffer)
          : await pdfDoc.embedJpg(imgBuffer);
        const contentW = spec.widthPt - 2 * margin;
        const scale = Math.min(contentW / image.width, imageAreaHeightPt / image.height);
        const drawW = image.width * scale;
        const drawH = image.height * scale;
        page.drawImage(image, {
          x: (spec.widthPt - drawW) / 2,
          y: spec.heightPt - margin - drawH,
          width: drawW,
          height: drawH,
        });
      } catch {
        // skip image if file missing
      }
      y = spec.heightPt * 0.45 - margin;
    }

    if (pg.type === 'ILLUSTRATION_PLEINE_PAGE' && pg.illustrationUrl) {
      try {
        const fullPath = join(UPLOAD_DIR, pg.illustrationUrl);
        const imgBuffer = await readFile(fullPath);
        const image = pg.illustrationUrl.endsWith('.png')
          ? await pdfDoc.embedPng(imgBuffer)
          : await pdfDoc.embedJpg(imgBuffer);
        const contentW = spec.widthPt - 2 * bleedPt;
        const contentH = spec.heightPt - 2 * bleedPt;
        const scale = Math.max(contentW / image.width, contentH / image.height);
        const drawW = image.width * scale;
        const drawH = image.height * scale;
        page.drawImage(image, {
          x: (spec.widthPt - drawW) / 2,
          y: (spec.heightPt - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      } catch {
        // skip
      }
    }

    if ((pg.type === 'TEXTE' || pg.type === 'MIXTE') && pg.textContent) {
      if (sceneTitle) {
        page.drawText(sceneTitle, {
          x: margin,
          y,
          size: fontSize,
          font: boldFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight + 4;
      }
      const lines = pg.textContent.split(/\n/).flatMap((line) => {
        const words = line.split(' ');
        const result: string[] = [];
        let current = '';
        for (const w of words) {
          const next = current ? `${current} ${w}` : w;
          if (font.widthOfTextAtSize(next, fontSize) > spec.widthPt - 2 * margin) {
            if (current) result.push(current);
            current = w;
          } else {
            current = next;
          }
        }
        if (current) result.push(current);
        return result;
      });
      for (const line of lines) {
        if (y < margin) break;
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
      }
    }

    const pageNum = i;
    page.drawText(`${pageNum}`, {
      x: spec.widthPt - margin - 20,
      y: 15,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    drawCropMarks(page);
  }

  const pdfBytes = await pdfDoc.save();
  const exportKey = `exports/${projectId}/interior-${Date.now()}.pdf`;
  const { getStorage } = await import('@/server/storage');
  const storage = getStorage();
  await storage.upload(exportKey, Buffer.from(pdfBytes), 'application/pdf');

  await prisma.exportFile.create({
    data: {
      projectId,
      type: 'interior_pdf',
      url: exportKey,
      metadata: JSON.stringify({ formatId, bleedMm, safeMarginMm }),
    },
  });

  return NextResponse.json({
    url: exportKey,
    downloadUrl: `/api/files/${encodeURIComponent(exportKey)}`,
  });
}
