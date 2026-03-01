'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function ExportPreparation({
  projectId,
  hasCover,
  hasBackcover,
}: {
  projectId: string;
  hasCover: boolean;
  hasBackcover: boolean;
}) {
  const router = useRouter();
  const [loadingCover, setLoadingCover] = useState(false);
  const [loadingBackcover, setLoadingBackcover] = useState(false);

  const generateCover = async () => {
    setLoadingCover(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate/cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec');
      }
      toast.success('Couverture generee');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoadingCover(false);
    }
  };

  const generateBackcover = async () => {
    setLoadingBackcover(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate/backcover`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec');
      }
      toast.success('4e de couverture générée');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoadingBackcover(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <h2 className="font-medium text-stone-800">Preparation pour l&apos;export</h2>
      <ul className="mt-2 space-y-2 text-sm">
        <li className={hasCover ? 'text-green-600' : 'text-stone-500'}>
          {hasCover ? '✓' : '○'} Couverture
          {!hasCover && (
            <button
              type="button"
              onClick={generateCover}
              disabled={loadingCover}
              className="ml-2 rounded border border-stone-300 bg-white px-2 py-0.5 text-stone-600 hover:bg-stone-100 disabled:opacity-50"
            >
              {loadingCover ? 'Generation…' : 'Generer'}
            </button>
          )}
        </li>
        <li className={hasBackcover ? 'text-green-600' : 'text-stone-500'}>
          {hasBackcover ? '✓' : '○'} 4e de couverture
          {!hasBackcover && (
            <button
              type="button"
              onClick={generateBackcover}
              disabled={loadingBackcover}
              className="ml-2 rounded border border-stone-300 bg-white px-2 py-0.5 text-stone-600 hover:bg-stone-100 disabled:opacity-50"
            >
              {loadingBackcover ? 'Génération…' : 'Générer'}
            </button>
          )}
        </li>
      </ul>
      {!(hasCover && hasBackcover) && (
        <p className="mt-2 text-xs text-stone-500">
          Le PDF couverture (wrap) nécessite la couverture et la 4e de couverture. Générez les éléments manquants ci-dessus.
        </p>
      )}
    </section>
  );
}
