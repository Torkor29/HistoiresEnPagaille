import Link from 'next/link';
import { prisma } from '@/server/db';
import { ProjectCard } from './ProjectCard';

export const dynamic = 'force-dynamic';

async function getProjects() {
  const list = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      assets: { select: { type: true, url: true } },
      story: { select: { synopsis: true, coverTitle: true } },
    },
  });
  return list.map((p) => {
    let displayTitle = p.title;
    if (displayTitle === 'Sans titre' && p.story?.coverTitle) displayTitle = p.story.coverTitle;
    if (displayTitle === 'Sans titre' && p.story?.synopsis) {
      try {
        const synopsis = JSON.parse(p.story.synopsis) as { title?: string };
        if (synopsis.title) displayTitle = synopsis.title;
      } catch {
        // keep Sans titre
      }
    }
    return {
      id: p.id,
      title: displayTitle,
      updatedAt: p.updatedAt,
      assets: p.assets,
    };
  });
}

export default async function HomePage() {
  const projects = await getProjects();
  return (
    <div>
      <div className="mb-8">
        <p className="text-stone-600">
          Retrouvez ici toutes vos histoires. Ouvrez une carte pour la modifier, la lire ou l&apos;exporter.
        </p>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 p-16 text-center">
          <p className="mb-6 text-lg text-stone-600">
            Aucune histoire pour l’instant. Créez votre première histoire personnalisée.
          </p>
          <Link
            href="/new"
            className="inline-flex rounded-xl bg-primary-500 px-6 py-3 font-medium text-white shadow-sm hover:bg-primary-600"
          >
            Nouvelle histoire
          </Link>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
