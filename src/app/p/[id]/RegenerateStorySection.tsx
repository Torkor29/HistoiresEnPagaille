'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function RegenerateStorySection({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRegenerateStory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate/story`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Échec');
      }
      toast.success('Histoire régénérée (même synopsis, nouveau texte et scènes)');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-medium text-stone-800">Modifier ou régénérer</h2>
      <p className="mb-4 text-sm text-stone-600">
        Pour ne pas tout recommencer en cas de souci, vous pouvez <strong>dupliquer le projet</strong> (bouton
        &quot;Dupliquer le projet&quot; ci-dessus) puis régénérer l&apos;histoire ou les illustrations sur la copie.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRegenerateStory}
          disabled={loading}
          className="rounded-lg border border-amber-400 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200 disabled:opacity-50"
        >
          {loading ? 'Génération…' : 'Régénérer l\'histoire (même synopsis)'}
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Garde le synopsis actuel et regénère le texte et les scènes. Les illustrations existantes seront supprimées ;
        vous pourrez les régénérer ensuite.
      </p>
    </section>
  );
}
