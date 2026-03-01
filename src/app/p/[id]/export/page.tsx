import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/server/db';
import { ExportActions } from './ExportActions';
import { ExportPreparation } from './ExportPreparation';

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: { story: true, assets: true },
  });
}

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const hasStory = !!project.story?.fullText;
  const hasCover = project.assets.some((a) => a.type === 'COVER_IMAGE');
  const hasBackcover = !!project.story?.backCoverSynopsis?.trim();

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/p/${id}`} className="text-primary-600 hover:underline">
        ← Retour au projet
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-stone-800">
        Exporter / Imprimer
      </h1>
      <p className="mt-2 text-stone-600">
        Téléchargez le PDF intérieur, la couverture (wrap), ou le pack impression (ZIP). Pour un imprimeur, utilisez le pack ZIP et suivez le guide ci-dessous.
      </p>
      <ExportPreparation
        projectId={id}
        hasCover={hasCover}
        hasBackcover={hasBackcover}
      />
      <ExportActions
        projectId={id}
        canExportInterior={hasStory}
        canExportCoverwrap={hasCover && hasBackcover}
        canExportBackcover={hasBackcover}
      />
      <section className="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-6">
        <h2 className="font-medium text-stone-800">Guide impression</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-600">
          <li>Téléchargez le &quot;Pack impression (ZIP)&quot;.</li>
          <li>Ouvrez le ZIP : vous y trouverez interior.pdf, les assets, metadata.json.</li>
          <li>Pour le PDF couverture (wrap), la couverture et la 4e de couverture doivent être générées (boutons ci-dessus).</li>
          <li>Fond perdu : 3 mm par défaut (réglable dans le format livre).</li>
          <li>Envoyez les PDF à votre imprimeur (KDP, Lulu, imprimerie locale) selon leurs consignes.</li>
        </ul>
      </section>
    </div>
  );
}
