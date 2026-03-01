import { NextRequest, NextResponse } from 'next/server';
import { gemini, getTextModel, isGeminiAvailable } from '@/server/services/gemini-client';
import { getIdeasForTheme } from '@/lib/idea-suggestions';

export type SuggestIdeasResponse = {
  ideas: Array<{ moral?: string; location?: string; magicObjectOrMission?: string }>;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const child = body.child as { firstName?: string; age?: number; interests?: string[] } | undefined;
  const theme = (body.theme as string) || 'aventure';
  const synopsisRaw = body.synopsis as string | undefined;

  console.log('[suggest-ideas] theme:', theme, 'synopsis fourni:', !!synopsisRaw);

  // Si on a un synopsis (ex. thème prédéfini choisi), on génère des idées COHÉRENTES avec cette histoire, pas génériques au thème.
  if (synopsisRaw && synopsisRaw.trim()) {
    if (!isGeminiAvailable()) {
      return NextResponse.json({ error: 'Service non configuré' }, { status: 503 });
    }
    try {
      let synopsisObj: unknown;
      try {
        synopsisObj = JSON.parse(synopsisRaw);
      } catch {
        synopsisObj = { summary: synopsisRaw };
      }
      const synopsisStr = typeof synopsisObj === 'object' && synopsisObj !== null
        ? JSON.stringify(synopsisObj, null, 0)
        : String(synopsisRaw);

      const prompt = `Tu es un assistant pour histoires pour enfants. Tu as ci-dessous le SYNOPSIS RÉEL de l'histoire (titre, chapitres, personnages, intrigue).

SYNOPSIS DE L'HISTOIRE (à respecter strictement) :
${synopsisStr}

Tâche : propose 3 idées (moral, location, magicObjectOrMission) qui sont DIRECTEMENT tirées de ou parfaitement cohérentes avec CE synopsis. Chaque idée doit faire apparaître des éléments qui sont DANS cette histoire (lieux, objets, quêtes, personnages, morale) — pas des idées génériques du thème.
- moral : une valeur ou morale que l'histoire porte ou peut porter (en lien avec l'intrigue)
- location : un lieu qui figure dans le synopsis ou qui en découle
- magicObjectOrMission : un objet, une quête ou une mission du synopsis (élément clé de l'histoire)

Propose 3 variantes différentes mais toutes ancrées dans ce synopsis (tu peux mettre l'accent sur un chapitre, un personnage ou un lieu différent pour chaque idée).

Réponds UNIQUEMENT en JSON valide :
{ "ideas": [
  { "moral": "...", "location": "...", "magicObjectOrMission": "..." },
  { "moral": "...", "location": "...", "magicObjectOrMission": "..." },
  { "moral": "...", "location": "...", "magicObjectOrMission": "..." }
] }
Langue : français.`;

      const response = await gemini.models.generateContent({
        model: getTextModel(),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text = (response as { text?: string })?.text ?? '';
      let jsonStr = text.trim();
      const m = jsonStr.match(/\{[\s\S]*\}/);
      if (m) jsonStr = m[0];
      const parsed = JSON.parse(jsonStr) as SuggestIdeasResponse;
      if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) throw new Error('Format invalide');
      return NextResponse.json(parsed);
    } catch (e) {
      console.error('[suggest-ideas] erreur synopsis:', e);
      // Fallback : on continue avec le flux thème seul ci-dessous
    }
  }

  // 1) Banque locale par thème (quand pas de synopsis ou erreur)
  const localIdeas = getIdeasForTheme(theme);
  if (localIdeas && localIdeas.length > 0) {
    const ideas = localIdeas.slice(0, 3);
    return NextResponse.json({ ideas });
  }

  // 2) Fallback Gemini basé sur le thème
  if (!isGeminiAvailable()) {
    return NextResponse.json(
      { error: 'Service non configuré' },
      { status: 503 }
    );
  }

  const prompt = `Tu es un assistant créatif pour histoires pour enfants.
Profil : ${child?.firstName ?? 'Léo'}, ${child?.age ?? 6} ans. Centres d'intérêt : ${(child?.interests ?? ['aventure']).join(', ')}.
Thème TRÈS important de l'histoire (doit guider toutes les idées) : "${theme}".

RÈGLES ABSOLUES :
- Toutes les idées doivent rester clairement DANS l'univers de ce thème.
- Les mots utilisés pour le lieu, l'objet et la morale doivent contenir au moins un élément directement relié au thème.
  - Exemples : si le thème contient "espace" alors il faut parler d'astronautes, fusée, vaisseau spatial, planète, étoiles, galaxie, station spatiale, comète, etc.
  - Si le thème contient "pirate", il faut parler de bateau pirate, île au trésor, coffre, sabre, carte au trésor, équipage, etc.
  - Adapte de la même manière pour les autres thèmes (dinosaures, forêt enchantée, école, ferme, sous-marin, etc.).
- Interdiction de proposer des lieux ou objets qui n'ont aucun lien clair avec le thème (par exemple un "jardin de légumes" pour un thème "espace" est interdit).

Propose 3 idées TRÈS différentes les unes des autres, mais toutes parfaitement adaptées au thème. Pour chaque idée, change vraiment :
- le type de problème ou de mission
- le lieu (mais toujours cohérent avec le thème "${theme}")
- le ton (plus drôle, plus tendre, plus mystérieux…) tout en restant bienveillant

Chaque idée doit contenir :
- une morale ou valeur (courte phrase, spécifique à l'idée, éviter les formulations trop générales comme "l'amitié c'est important")
- un lieu où se déroule principalement l'histoire (dans l'univers du thème "${theme}")
- un objet magique ou une mission claire (dans l'univers du thème "${theme}")

Réponds UNIQUEMENT en JSON valide :
{ "ideas": [
  { "moral": "...", "location": "...", "magicObjectOrMission": "..." },
  { "moral": "...", "location": "...", "magicObjectOrMission": "..." },
  { "moral": "...", "location": "...", "magicObjectOrMission": "..." }
] }
Langue : français.`;

  try {
    const response = await gemini.models.generateContent({
      model: getTextModel(),
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = (response as { text?: string })?.text ?? '';
    let jsonStr = text.trim();
    const m = jsonStr.match(/\{[\s\S]*\}/);
    if (m) jsonStr = m[0];
    const parsed = JSON.parse(jsonStr) as SuggestIdeasResponse;
    if (!Array.isArray(parsed.ideas)) throw new Error('Format invalide');
    return NextResponse.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
