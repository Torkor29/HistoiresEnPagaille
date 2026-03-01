'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function GenerateFromSynopsis({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');

  const run = async () => {
    setLoading(true);
    try {
      setStep('Rédaction…');
      const resStory = await fetch(`/api/projects/${projectId}/generate/story`, { method: 'POST' });
      if (!resStory.ok) {
        const d = await resStory.json().catch(() => ({}));
        throw new Error(d.error || 'Échec rédaction');
      }
      toast.success('Texte généré');
      setStep('Illustrations…');
      const resIllus = await fetch(`/api/projects/${projectId}/generate/illustrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'fast' }),
      });
      if (!resIllus.ok) {
        const d = await resIllus.json().catch(() => ({}));
        throw new Error(d.error || 'Échec illustrations');
      }
      toast.success('Illustrations générées');
      setStep('Couverture…');
      await fetch(`/api/projects/${projectId}/generate/cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await fetch(`/api/projects/${projectId}/generate/backcover`, { method: 'POST' });
      toast.success('Couverture et 4e générées');
      setStep('');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
      setStep('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-6">
      <h2 className="text-lg font-medium text-primary-900">Tome 2 — Synopsis prêt</h2>
      <p className="mt-1 text-sm text-primary-800">
        Ce projet a un synopsis (suite) mais pas encore le texte ni les illustrations. Lancez la génération pour créer l&apos;histoire complète.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? step || 'Génération…' : 'Générer le texte et les illustrations'}
      </button>
    </section>
  );
}
