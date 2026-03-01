/**
 * Moteur de mise en page pour PDF intérieur.
 * Utilise les dimensions du format livre et le BookLayoutPlan.
 */

import type { BookLayoutPlan } from '@/lib/schemas';

export interface PageSpec {
  widthPt: number;
  heightPt: number;
  marginPt: number;
  safeMarginPt: number;
  bleedPt: number;
}

const MM_TO_PT = 2.834645669;

export function getPageSpec(
  formatId: string,
  bleedMm: number = 3,
  safeMarginMm: number = 5
): PageSpec {
  const formats: Record<string, [number, number]> = {
    a4: [210, 297],
    a5: [148, 210],
    'us-letter': [215.9, 279.4],
    '8x8': [203.2, 203.2],
    '6x9': [152.4, 228.6],
    '8.5x8.5': [215.9, 215.9],
  };
  const [wMm, hMm] = formats[formatId] || [210, 297];
  return {
    widthPt: wMm * MM_TO_PT,
    heightPt: hMm * MM_TO_PT,
    marginPt: 15 * MM_TO_PT,
    safeMarginPt: safeMarginMm * MM_TO_PT,
    bleedPt: bleedMm * MM_TO_PT,
  };
}

export function buildPagesFromLayout(
  plan: BookLayoutPlan,
  sceneTexts: Map<string, string>,
  sceneIllustrationUrls: Map<string, string | null>
): Array<{
  type: 'TEXTE' | 'ILLUSTRATION_PLEINE_PAGE' | 'MIXTE';
  sceneId: string | null;
  textContent?: string;
  illustrationUrl?: string | null;
}> {
  const pages: Array<{
    type: 'TEXTE' | 'ILLUSTRATION_PLEINE_PAGE' | 'MIXTE';
    sceneId: string | null;
    textContent?: string;
    illustrationUrl?: string | null;
  }> = [];
  for (const p of plan.pages) {
    pages.push({
      type: p.type as 'TEXTE' | 'ILLUSTRATION_PLEINE_PAGE' | 'MIXTE',
      sceneId: p.sceneId ?? null,
      textContent: p.textContent ?? (p.sceneId ? sceneTexts.get(p.sceneId) : undefined),
      illustrationUrl: p.sceneId ? sceneIllustrationUrls.get(p.sceneId) ?? null : null,
    });
  }
  return pages;
}
