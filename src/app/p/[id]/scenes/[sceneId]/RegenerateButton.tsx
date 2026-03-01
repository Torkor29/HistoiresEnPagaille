'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export function RegenerateButton({
  projectId,
  sceneId,
}: {
  projectId: string;
  sceneId: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scenes/${sceneId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageOnly: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec');
      }
      toast.success('Illustration régénérée');
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRegenerate}
      disabled={loading}
      className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
    >
      {loading ? 'Régénération…' : 'Régénérer l\'illustration'}
    </button>
  );
}
