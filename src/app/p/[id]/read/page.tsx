import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/server/db';
import type { BookLayoutPlan } from '@/lib/schemas';
import type { BookPage } from '@/components/BookPreview';
import { ReadView } from './ReadView';

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
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

function buildBookPages(project: NonNullable<Awaited<ReturnType<typeof getProject>>>): BookPage[] {
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

  // Format imprimable par défaut : une page TEXTE puis une page ILLUSTRATION par scène (texte à gauche, illu à droite en livre ouvert)
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
      pages.push({
        type: 'mixed',
        title: scene.title ?? undefined,
        text,
        imageUrl,
      });
    } else if (p.type === 'TEXTE' && (p.textContent || scene?.text)) {
      pages.push({
        type: 'text',
        title: scene?.title ?? undefined,
        text: p.textContent ?? scene!.text,
      });
    } else if ((p.type === 'ILLUSTRATION_PLEINE_PAGE') && scene) {
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

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project?.story) notFound();

  const scenes = project.story.scenes;
  let storyTitle = project.story.coverTitle || project.title;
  if (storyTitle === 'Sans titre' && project.story.synopsis) {
    try {
      const synopsis = JSON.parse(project.story.synopsis) as { title?: string };
      if (synopsis.title) storyTitle = synopsis.title;
    } catch {
      // keep
    }
  }

  const bookPages = buildBookPages(project);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/p/${id}`} className="text-primary-600 hover:underline">
          ← Retour au projet
        </Link>
      </div>
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
                <p key={i} className="text-stone-700">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </ReadView>
    </div>
  );
}
