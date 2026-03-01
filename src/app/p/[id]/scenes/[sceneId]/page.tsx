import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/server/db';
import { RegenerateButton } from './RegenerateButton';
import { IllustrationCorrectionForm } from './IllustrationCorrectionForm';
import type { StoryCharacter } from '@/lib/schemas';

async function getScene(projectId: string, sceneId: string) {
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, story: { projectId } },
    include: {
      story: { include: { project: true } },
      illustrationAsset: true,
    },
  });
  return scene;
}

/** Retourne la tenue à afficher pour la correction "Remplacer par tenue histoire" (contexte ou quotidien). */
function getStoryOutfitForCorrection(
  sceneOutfitContext: string | null | undefined,
  characters: StoryCharacter[]
): { label: string; description: string } | null {
  const principal = characters.find((c) => c.role === 'principal');
  if (!principal || isAnimalCharacter(principal)) return null;
  const contextKey = (sceneOutfitContext || '').trim().toLowerCase();
  const contextOutfit =
    contextKey && principal.contextOutfits?.length
      ? principal.contextOutfits.find((o) => o.context.trim().toLowerCase() === contextKey)
      : null;
  const description = contextOutfit
    ? contextOutfit.outfitDescription
    : (principal.defaultOutfit || '').trim();
  if (!description) return null;
  const label = contextOutfit
    ? `Tenue histoire (${contextKey})`
    : 'Tenue du quotidien';
  return { label, description };
}

function isAnimalCharacter(c: StoryCharacter): boolean {
  return !c.defaultOutfit && (!c.contextOutfits || c.contextOutfits.length === 0) && !!c.visualDescription;
}

export default async function SceneDetailPage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const { id, sceneId } = await params;
  const scene = await getScene(id, sceneId);
  if (!scene) notFound();

  let initialCorrection: { type: 'tenue' | 'coupe' | 'autre'; detail: string } | null = null;
  if (scene.illustrationCorrection) {
    try {
      const parsed = JSON.parse(scene.illustrationCorrection) as { type?: string; detail?: string };
      const type = ['tenue', 'coupe', 'autre'].includes(parsed.type ?? '') ? parsed.type as 'tenue' | 'coupe' | 'autre' : 'autre';
      initialCorrection = { type, detail: (parsed.detail ?? '').trim() };
    } catch {
      initialCorrection = { type: 'autre', detail: scene.illustrationCorrection };
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/p/${id}`} className="text-primary-600 hover:underline">
        ← Retour au projet
      </Link>
      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-stone-800">
          {scene.title || `Scène ${scene.order + 1}`}
        </h1>
        {scene.illustrationAsset && (
          <img
            src={`/api/files/${encodeURIComponent(scene.illustrationAsset.url)}`}
            alt=""
            className="mt-4 w-full rounded-lg"
          />
        )}
        <div className="mt-4 text-stone-700">
          {scene.text.split(/\n\n/).map((p, i) => (
            <p key={i} className="mb-2">{p}</p>
          ))}
        </div>
        <div className="mt-6 border-t border-stone-200 pt-4 space-y-4">
          <IllustrationCorrectionForm sceneId={sceneId} initialCorrection={initialCorrection} storyOutfitForCorrection={storyOutfitForCorrection} />
          <RegenerateButton projectId={id} sceneId={sceneId} />
        </div>
      </div>
    </div>
  );
}
