'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

type Project = {
  id: string;
  title: string;
  updatedAt: Date;
  // on reflète ici le minimum utile du modèle Prisma
  selectedCoverAssetId?: string | null;
  assets: { id?: string; type: string; url: string }[];
};

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const coverCandidates = project.assets.filter((a) => a.type === 'COVER_IMAGE');
  const coverAsset = project.selectedCoverAssetId
    ? coverCandidates.find((a) => a.id === project.selectedCoverAssetId) ?? coverCandidates[0]
    : coverCandidates[0];
  const coverUrl = coverAsset
    ? `/api/files/${encodeURIComponent(coverAsset.url)}`
    : null;

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDuplicating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur');
      }
      const data = await res.json();
      toast.success('Variante créée');
      router.push(`/p/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible de dupliquer');
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Supprimer cette histoire ? Cette action est irréversible.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Suppression échouée');
      toast.success('Histoire supprimée');
      router.refresh();
    } catch {
      toast.error('Impossible de supprimer');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-primary-200 hover:shadow-md">
      <Link href={`/p/${project.id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400">
              <span className="text-4xl">📖</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h2 className="font-semibold text-stone-800 line-clamp-2 group-hover:text-primary-600">
            {project.title}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Modifié le {new Date(project.updatedAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </Link>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-stone-100 p-3">
        <Link
          href={`/p/${project.id}/edit`}
          className="min-w-0 rounded-lg border border-stone-200 bg-white py-2 text-center text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Modifier
        </Link>
        <Link
          href={`/p/${project.id}/read`}
          className="min-w-0 rounded-lg bg-primary-500 py-2 text-center text-sm font-medium text-white hover:bg-primary-600"
        >
          Lire
        </Link>
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={duplicating}
          className="min-w-0 rounded-lg border border-stone-200 py-2 text-center text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          title="Dupliquer le projet (garder une copie)"
        >
          {duplicating ? '…' : 'Dupliquer'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="min-w-0 rounded-lg border border-red-200 py-2 text-center text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          title="Supprimer l'histoire"
        >
          {deleting ? '…' : 'Supprimer'}
        </button>
      </div>
    </article>
  );
}
