import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { PREMADE_THEMES } from '@/lib/premade-themes';

/**
 * GET — Retourne tous les thèmes et les synopsis stockés en base (affichage instantané, pas de chargement au survol).
 */
export async function GET() {
  const stored = await prisma.premadeSynopsis.findMany({
    orderBy: [{ themeId: 'asc' }, { sortOrder: 'asc' }],
  });
  const synopsesByTheme: Record<string, Array<{
    id: string;
    themeId: string;
    themeLabel: string;
    icon: string;
    synopsis: unknown;
    sortOrder: number;
  }>> = {};
  for (const row of stored) {
    let synopsis: unknown;
    try {
      synopsis = JSON.parse(row.synopsis);
    } catch {
      continue;
    }
    if (!synopsesByTheme[row.themeId]) {
      synopsesByTheme[row.themeId] = [];
    }
    synopsesByTheme[row.themeId].push({
      id: row.id,
      themeId: row.themeId,
      themeLabel: row.themeLabel,
      icon: row.icon,
      synopsis,
      sortOrder: row.sortOrder,
    });
  }
  return NextResponse.json({
    themes: PREMADE_THEMES,
    synopsesByTheme,
  });
}
