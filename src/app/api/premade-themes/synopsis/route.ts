import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { PREMADE_THEMES } from '@/lib/premade-themes';
import { generatePremadeSynopsis } from '@/server/services/gemini-text';
import { getGeminiUserMessage } from '@/server/services/gemini-client';
import { v4 } from 'uuid';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const themeId = typeof body.themeId === 'string' ? body.themeId.trim() : '';
  const saveToDb = body.saveToDb === true;
  const theme = PREMADE_THEMES.find((t) => t.id === themeId);
  if (!theme) {
    return NextResponse.json({ error: 'Thème introuvable' }, { status: 400 });
  }

  const requestId = v4();
  try {
    const synopsis = await generatePremadeSynopsis(theme.label, requestId);
    if (saveToDb) {
      const maxOrder = await prisma.premadeSynopsis
        .findMany({ where: { themeId }, select: { sortOrder: true }, orderBy: { sortOrder: 'desc' }, take: 1 })
        .then((r) => r[0]?.sortOrder ?? -1);
      await prisma.premadeSynopsis.create({
        data: {
          themeId: theme.id,
          themeLabel: theme.label,
          icon: theme.icon,
          synopsis: JSON.stringify(synopsis),
          sortOrder: maxOrder + 1,
        },
      });
    }
    return NextResponse.json({ synopsis });
  } catch (e) {
    const message = getGeminiUserMessage(e) ?? (e instanceof Error ? e.message : 'Erreur');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
