import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { PREMADE_THEMES } from '@/lib/premade-themes';
import { generatePremadeSynopsis } from '@/server/services/gemini-text';
import { getGeminiUserMessage } from '@/server/services/gemini-client';
import { v4 } from 'uuid';

type Scope = 'all' | 'theme' | 'one';

/**
 * POST — Régénère des synopsis et les enregistre en base.
 * body: { scope: 'all' | 'theme' | 'one', themeId?: string, synopsisId?: string }
 * - all: régénère 2 synopsis par thème pour tous les thèmes
 * - theme: régénère 2 synopsis pour le thème donné (themeId requis)
 * - one: supprime le synopsis (synopsisId) et en génère un nouveau pour le même thème
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const scope = (body.scope as Scope) || 'all';
  const themeId = typeof body.themeId === 'string' ? body.themeId.trim() : null;
  const synopsisId = typeof body.synopsisId === 'string' ? body.synopsisId.trim() : null;

  if (scope === 'theme' && !themeId) {
    return NextResponse.json({ error: 'themeId requis pour scope theme' }, { status: 400 });
  }
  if (scope === 'one' && !synopsisId) {
    return NextResponse.json({ error: 'synopsisId requis pour scope one' }, { status: 400 });
  }

  const requestId = v4();
  // Nombre de NOUVEAUX synopsis ajoutés par thème quand on enrichit la banque.
  const countPerTheme = 6;

  try {
    if (scope === 'one') {
      const existing = await prisma.premadeSynopsis.findUnique({ where: { id: synopsisId } });
      if (!existing) return NextResponse.json({ error: 'Synopsis introuvable' }, { status: 404 });
      await prisma.premadeSynopsis.delete({ where: { id: synopsisId } });
      const synopsis = await generatePremadeSynopsis(existing.themeLabel, requestId);
      await prisma.premadeSynopsis.create({
        data: {
          themeId: existing.themeId,
          themeLabel: existing.themeLabel,
          icon: existing.icon,
          synopsis: JSON.stringify(synopsis),
          sortOrder: existing.sortOrder,
        },
      });
      return NextResponse.json({ ok: true, message: 'Synopsis régénéré' });
    }

    if (scope === 'theme') {
      const theme = PREMADE_THEMES.find((t) => t.id === themeId);
      if (!theme) return NextResponse.json({ error: 'Thème introuvable' }, { status: 400 });

      // On NE supprime plus : on ajoute de nouveaux synopsis à la suite.
      const last = await prisma.premadeSynopsis.findMany({
        where: { themeId: theme.id },
        orderBy: { sortOrder: 'desc' },
        take: 1,
      });
      let sortBase = last[0]?.sortOrder ?? -1;

      let created = 0;
      for (let i = 0; i < countPerTheme; i++) {
        const synopsis = await generatePremadeSynopsis(theme.label, v4());
        sortBase += 1;
        await prisma.premadeSynopsis.create({
          data: {
            themeId: theme.id,
            themeLabel: theme.label,
            icon: theme.icon,
            synopsis: JSON.stringify(synopsis),
            sortOrder: sortBase,
          },
        });
        created += 1;
      }
      return NextResponse.json({ ok: true, message: `${created} nouveaux synopsis ajoutés pour ${theme.label}` });
    }

    // scope === 'all' : enrichit tous les thèmes sans rien supprimer.
    let created = 0;
    for (const theme of PREMADE_THEMES) {
      const last = await prisma.premadeSynopsis.findMany({
        where: { themeId: theme.id },
        orderBy: { sortOrder: 'desc' },
        take: 1,
      });
      let sortBase = last[0]?.sortOrder ?? -1;
      for (let i = 0; i < countPerTheme; i++) {
        try {
          const synopsis = await generatePremadeSynopsis(theme.label, v4());
          sortBase += 1;
          await prisma.premadeSynopsis.create({
            data: {
              themeId: theme.id,
              themeLabel: theme.label,
              icon: theme.icon,
              synopsis: JSON.stringify(synopsis),
              sortOrder: sortBase,
            },
          });
          created++;
        } catch (err) {
          console.error(`PremadeSynopsis ${theme.id} #${i}`, err);
        }
      }
    }
    return NextResponse.json({ ok: true, message: `${created} synopsis générés`, created });
  } catch (e) {
    const message = getGeminiUserMessage(e) ?? (e instanceof Error ? e.message : 'Erreur');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
