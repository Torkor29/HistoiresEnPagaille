'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function CoverAndBackcoverSection({
  projectId,
  coverImageUrl,
  coverCandidates = [],
  selectedCoverAssetId = null,
  backCoverSynopsis,
}: {
  projectId: string;
  coverImageUrl: string | null;
  coverCandidates?: { id: string; url: string }[];
  selectedCoverAssetId?: string | null;
  backCoverSynopsis: string | null;
}) {
  const router = useRouter();
  const [loadingCover, setLoadingCover] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingBackcover, setLoadingBackcover] = useState(false);
  const [selectingCover, setSelectingCover] = useState<string | null>(null);

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
        throw new Error(data.error || 'Échec génération couverture');
      }
      toast.success('Couverture générée');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoadingCover(false);
    }
  };

  const generateCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate/cover/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec génération');
      }
      toast.success('3 propositions générées — choisissez celle que vous préférez');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const selectCover = async (assetId: string) => {
    setSelectingCover(assetId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedCoverAssetId: assetId }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Couverture choisie');
      router.refresh();
    } catch {
      toast.error('Impossible de sélectionner');
    } finally {
      setSelectingCover(null);
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
        throw new Error(data.error || 'Échec génération 4e de couverture');
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
    <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-medium text-stone-800">Couverture et 4e de couverture</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm text-stone-600">Couverture</p>
          {coverImageUrl ? (
            <div className="space-y-2">
              <img
                src={coverImageUrl}
                alt="Couverture"
                className="max-h-64 w-full rounded-lg border border-stone-200 object-contain"
              />
              {coverCandidates.length > 1 && (
                <div className="mt-2">
                  <p className="mb-1 text-xs text-stone-500">Choisir une autre proposition :</p>
                  <div className="flex flex-wrap gap-2">
                    {coverCandidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCover(c.id)}
                        disabled={!!selectingCover}
                        className={`rounded border p-1 ${selectedCoverAssetId === c.id ? 'border-primary-500 ring-2 ring-primary-300' : 'border-stone-200 hover:border-stone-400'}`}
                        title="Choisir comme couverture"
                      >
                        <img src={c.url} alt="" className="h-16 w-auto rounded object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={generateCandidates}
                  disabled={loadingCandidates || loadingCover}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  {loadingCandidates ? 'Génération…' : 'Générer 3 propositions'}
                </button>
                <button
                  type="button"
                  onClick={generateCover}
                  disabled={loadingCover || loadingCandidates}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  {loadingCover ? 'Génération…' : 'Régénérer une couverture'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateCover}
                disabled={loadingCover || loadingCandidates}
                className="rounded-lg border border-primary-500 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
              >
                {loadingCover ? 'Génération…' : 'Générer la couverture'}
              </button>
              <button
                type="button"
                onClick={generateCandidates}
                disabled={loadingCover || loadingCandidates}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {loadingCandidates ? 'Génération…' : 'Générer 3 propositions'}
              </button>
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm text-stone-600">4e de couverture (synopsis)</p>
          {backCoverSynopsis ? (
            <div className="space-y-2">
              <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                {backCoverSynopsis}
              </p>
              <button
                type="button"
                onClick={generateBackcover}
                disabled={loadingBackcover}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {loadingBackcover ? 'Génération…' : 'Régénérer la 4e de couverture'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={generateBackcover}
              disabled={loadingBackcover}
              className="rounded-lg border border-primary-500 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
            >
              {loadingBackcover ? 'Génération…' : 'Générer la 4e de couverture'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
