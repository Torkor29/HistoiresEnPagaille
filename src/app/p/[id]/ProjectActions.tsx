'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function ProjectActions({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [sharing, setSharing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [sequel, setSequel] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, { method: 'POST' });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      const token = data.shareToken;
      const url = typeof window !== 'undefined' ? `${window.location.origin}/l/${token}` : '';
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié ! Partagé en lecture seule.');
      } else {
        toast.success(`Lien : ${url}`);
      }
    } catch {
      toast.error('Impossible de créer le lien');
    } finally {
      setSharing(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur');
      }
      const data = await res.json();
      toast.success('Variante créée');
      router.push(`/p/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDuplicating(false);
    }
  };

  const handleSequel = async () => {
    setSequel(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sequel`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur');
      }
      const data = await res.json();
      toast.success('Tome 2 créé — vous pouvez maintenant générer le texte et les illustrations');
      router.push(`/p/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSequel(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/p/${projectId}/edit`}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-700 hover:bg-stone-50"
        title="Revoir les paramètres (enfant, thème, idées, images) puis régénérer tout"
      >
        Modifier
      </Link>
      <Link
        href={`/p/${projectId}/read`}
        className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
      >
        Lire l&apos;histoire
      </Link>
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
      >
        {sharing ? '…' : 'Partager (lien lecture seule)'}
      </button>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={duplicating}
        title="Garder une copie du projet avant de régénérer (évite de tout recommencer si ça foire)"
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
      >
        {duplicating ? '…' : 'Dupliquer le projet'}
      </button>
      <button
        type="button"
        onClick={handleSequel}
        disabled={sequel}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        title="Générer une suite (tome 2) avec les mêmes personnages"
      >
        {sequel ? '…' : 'Générer une suite (tome 2)'}
      </button>
      <Link
        href={`/p/${projectId}/export`}
        className="rounded-lg border border-primary-500 bg-white px-4 py-2 text-primary-600 hover:bg-primary-50"
      >
        Exporter / Imprimer
      </Link>
    </div>
  );
}
