import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { CoverAndBackcoverSection } from './CoverAndBackcoverSection';
import { SynopsisDisplay } from './SynopsisDisplay';
import { ProjectActions } from './ProjectActions';
import { GenerateFromSynopsis } from './GenerateFromSynopsis';
import { RegenerateStorySection } from './RegenerateStorySection';

type Asset = { id: string; type: string; url: string; createdAt: Date };

async function getProject(id: string) {
  const project = await prisma.project.findUnique({
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
  return project;
}

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const hasStory = !!project.story?.fullText;
  const hasScenes = (project.story?.scenes.length ?? 0) > 0;
  const hasIllustrations = project.story?.scenes?.some((s) => s.illustrationAssetId) ?? false;
  const coverAssets = (project.assets as Asset[]).filter((a) => a.type === 'COVER_IMAGE').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const coverAsset = project.selectedCoverAssetId
    ? (project.assets as Asset[]).find((a) => a.id === project.selectedCoverAssetId) || coverAssets[0]
    : coverAssets[0];

  let displayTitle = project.title;
  if (displayTitle === 'Sans titre' && project.story?.synopsis) {
    try {
      const synopsis = JSON.parse(project.story.synopsis) as { title?: string };
      if (synopsis.title) displayTitle = synopsis.title;
    } catch {
      // keep Sans titre
    }
  }
  if (displayTitle === 'Sans titre' && project.story?.coverTitle) displayTitle = project.story.coverTitle;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-stone-800">{displayTitle}</h1>
        <ProjectActions projectId={id} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-medium text-stone-800">État du projet</h2>
          <ul className="space-y-2 text-sm">
            <li className={hasStory ? 'text-green-600' : 'text-stone-500'}>
              {hasStory ? '✓' : '○'} Histoire générée
            </li>
            <li className={hasScenes ? 'text-green-600' : 'text-stone-500'}>
              {hasScenes ? '✓' : '○'} Scènes ({project.story?.scenes.length ?? 0})
            </li>
            <li className={hasIllustrations ? 'text-green-600' : 'text-stone-500'}>
              {hasIllustrations ? '✓' : '○'} Illustrations
            </li>
            <li className={coverAsset ? 'text-green-600' : 'text-stone-500'}>
              {coverAsset ? '✓' : '○'} Couverture
            </li>
          </ul>
        </section>
        <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-medium text-stone-800">Export & impression</h2>
          <p className="text-sm text-stone-600">
            Utilisez le bouton &quot;Exporter / Imprimer&quot; ci-dessus pour télécharger les PDF.
          </p>
        </section>
      </div>
      {project.story?.synopsis && !project.story?.fullText && (
        <GenerateFromSynopsis projectId={id} />
      )}
      {project.story?.synopsis && project.story?.fullText && (
        <RegenerateStorySection projectId={id} />
      )}
      {project.story && (
        <CoverAndBackcoverSection
          projectId={id}
          coverImageUrl={coverAsset ? `/api/files/${encodeURIComponent(coverAsset.url)}` : null}
          coverCandidates={coverAssets.map((a) => ({ id: a.id, url: `/api/files/${encodeURIComponent(a.url)}` }))}
          selectedCoverAssetId={project.selectedCoverAssetId}
          backCoverSynopsis={project.story.backCoverSynopsis}
        />
      )}
      {project.story?.synopsis && (
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-stone-800">Synopsis</h2>
          <SynopsisDisplay synopsis={project.story.synopsis} />
        </section>
      )}
      {hasScenes && (
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-medium text-stone-800">Scènes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.story!.scenes.map((scene) => (
              <div
                key={scene.id}
                className="rounded-lg border border-stone-200 p-4"
              >
                {scene.illustrationAsset && (
                  <img
                    src={`/api/files/${encodeURIComponent(scene.illustrationAsset.url)}`}
                    alt=""
                    className="mb-2 h-32 w-full rounded object-cover"
                  />
                )}
                <h3 className="font-medium text-stone-800">{scene.title || `Scène ${scene.order + 1}`}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-stone-600">{scene.text}</p>
                <Link
                  href={`/p/${id}/scenes/${scene.id}`}
                  className="mt-2 inline-block text-sm text-primary-600 hover:underline"
                >
                  Détail / Régénérer
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
