import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import type { BookLayoutPlan } from '@/lib/schemas';
import type { BookPage } from '@/components/BookPreview';
import { ReadView } from '@/app/p/[id]/read/ReadView';

async function getProjectByShareToken(token: string) {
  return prisma.project.findFirst({
    where: { shareToken: token },
    include: {
      story: {
        include: {
          scenes: {
            orderBy: { order: 'asc' },
            include: { illustrationAsset: true },
          },
        },
      },
      assets: true,
    },
  });
}

function buildBookPages(project: NonNullable<Awaited<ReturnType<typeof getProjectByShareToken>>>): BookPage[] {
  const story = project.story!;
  const scenes = story.scenes;
  const coverCandidates = project.assets.filter((a) => a.type === 'COVER_IMAGE');
  const coverAsset = project.selectedCoverAssetId
    ? coverCandidates.find((a) => a.id === project.selectedCoverAssetId) ?? coverCandidates[0]
    : coverCandidates[0];
  let storyTitle = story.coverTitle || project.title;
  if (storyTitle === 'Sans titre' && story.synopsis) {
    try {
      const synopsis = JSON.parse(story.synopsis) as { title?: string };
      if (synopsis.title) storyTitle = synopsis.title;
    } catch {
      // keep
    }
  }

  const pages: BookPage[] = [];
  pages.push({
    type: 'cover',
    title: storyTitle,
    subtitle: story.coverSubtitle ?? undefined,
    imageUrl: coverAsset ? `/api/files/${encodeURIComponent(coverAsset.url)}` : null,
  });

  const sceneMap = new Map(scenes.map((s) => [s.id, s]));
  let layoutPages: Array<{ type: string; sceneId: string | null; textContent?: string; illustrationAssetId?: string | null }>;

  if (story.layoutPlan) {
    try {
      const plan = JSON.parse(story.layoutPlan) as BookLayoutPlan;
      layoutPages = plan.pages;
    } catch {
      layoutPages = [];
    }
  } else {
    layoutPages = [];
  }

  if (layoutPages.length === 0) {
    for (const s of scenes) {
      layoutPages.push({ type: 'TEXTE', sceneId: s.id, textContent: s.text });
      layoutPages.push({ type: 'ILLUSTRATION_PLEINE_PAGE', sceneId: s.id, illustrationAssetId: s.illustrationAssetId });
    }
  }

  for (const p of layoutPages) {
    const scene = p.sceneId ? sceneMap.get(p.sceneId) : null;
    if (p.type === 'MIXTE' && scene) {
      const text = p.textContent ?? scene.text;
      const imageUrl = scene.illustrationAsset
        ? `/api/files/${encodeURIComponent(scene.illustrationAsset.url)}`
        : '';
      pages.push({ type: 'mixed', title: scene.title ?? undefined, text, imageUrl });
    } else if (p.type === 'TEXTE' && (p.textContent || scene?.text)) {
      pages.push({ type: 'text', title: scene?.title ?? undefined, text: p.textContent ?? scene!.text });
    } else if (p.type === 'ILLUSTRATION_PLEINE_PAGE' && scene) {
      const imageUrl = scene.illustrationAsset
        ? `/api/files/${encodeURIComponent(scene.illustrationAsset.url)}`
        : '';
      if (imageUrl) {
        pages.push({
          type: 'illustration',
          imageUrl,
          title: scene.title ?? undefined,
        });
      }
    }
  }

  if (story.backCoverSynopsis) {
    pages.push({ type: 'backcover', text: story.backCoverSynopsis });
  }
  return pages;
}

export default async function SharedReadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = await getProjectByShareToken(token);
  if (!project?.story) notFound();

  const bookPages = buildBookPages(project);
  const storyTitle = project.story.coverTitle || project.title;
  const scenes = project.story.scenes;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <p className="mb-4 text-center text-sm text-stone-500">
        Lecture seule — partagé avec vous
      </p>
      <ReadView bookPages={bookPages}>
        <header className="text-center">
          <h1 className="text-3xl font-bold text-stone-800">{storyTitle}</h1>
          {project.story.coverSubtitle && (
            <p className="mt-2 text-lg text-stone-600">{project.story.coverSubtitle}</p>
          )}
        </header>
        {scenes.map((scene) => (
          <section key={scene.id} className="space-y-4">
            {scene.illustrationAsset && (
              <figure>
                <img
                  src={`/api/files/${encodeURIComponent(scene.illustrationAsset.url)}`}
                  alt=""
                  className="w-full rounded-lg shadow-md"
                />
              </figure>
            )}
            {scene.title && (
              <h2 className="text-xl font-semibold text-stone-800">{scene.title}</h2>
            )}
            <div className="prose prose-stone max-w-none">
              {scene.text.split(/\n\n/).map((p, i) => (
                <p key={i} className="text-stone-700">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </ReadView>
    </div>
  );
}
