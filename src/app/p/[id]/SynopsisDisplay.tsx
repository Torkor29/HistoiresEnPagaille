import type { SynopsisOutput } from '@/lib/schemas';

type SynopsisData = SynopsisOutput | string | null | undefined;

function parseSynopsis(raw: SynopsisData): SynopsisOutput | null {
  if (!raw) return null;
  if (typeof raw === 'object' && 'title' in raw && Array.isArray((raw as SynopsisOutput).chapters)) {
    return raw as SynopsisOutput;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && 'chapters' in parsed) return parsed as SynopsisOutput;
    } catch {
      // pas du JSON : afficher comme paragraphe unique
      return { title: '', childCharacterName: '', chapters: [], moral: raw };
    }
  }
  return null;
}

export function SynopsisDisplay({ synopsis }: { synopsis: SynopsisData }) {
  const data = parseSynopsis(synopsis);
  if (!data) return null;

  // Cas : synopsis brut (string passée dans moral)
  if (typeof synopsis === 'string' && !data.chapters?.length && data.moral === synopsis) {
    return (
      <div className="prose prose-stone max-w-none text-stone-600">
        <p className="whitespace-pre-wrap">{synopsis}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-stone-700">
      {data.title && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Titre</h3>
          <p className="mt-0.5 text-lg font-medium text-stone-800">{data.title}</p>
        </div>
      )}
      {data.childCharacterName && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Personnage principal
          </h3>
          <p className="mt-0.5">{data.childCharacterName}</p>
        </div>
      )}
      {data.moral && typeof data.moral === 'string' && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Morale</h3>
          <p className="mt-0.5">{data.moral}</p>
        </div>
      )}
      {data.chapters && data.chapters.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Chapitres
          </h3>
          <ul className="space-y-4">
            {data.chapters.map((chapter, i) => (
              <li key={i} className="rounded-lg border border-stone-200 bg-stone-50/50 p-4">
                <h4 className="font-medium text-stone-800">{chapter.title}</h4>
                <ul className="mt-2 space-y-2 pl-4">
                  {chapter.scenes?.map((scene, j) => (
                    <li key={j} className="border-l-2 border-primary-200 pl-3">
                      <span className="font-medium text-stone-700">{scene.title}</span>
                      <p className="mt-0.5 text-sm text-stone-600">{scene.summary}</p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
