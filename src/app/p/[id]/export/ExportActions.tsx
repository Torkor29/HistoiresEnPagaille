'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export function ExportActions({
  projectId,
  canExportInterior = true,
  canExportCoverwrap = true,
  canExportBackcover = true,
}: {
  projectId: string;
  canExportInterior?: boolean;
  canExportCoverwrap?: boolean;
  canExportBackcover?: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const doExport = async (type: 'interior' | 'coverwrap' | 'backcover' | 'printpack' | 'preview') => {
    setLoading(type === 'preview' ? 'preview' : type);
    try {
      const path =
        type === 'preview' || type === 'interior'
          ? `pdf/interior`
          : type === 'coverwrap'
            ? `pdf/coverwrap`
            : type === 'backcover'
              ? `pdf/backcover`
              : `printpack`;
      const res = await fetch(`/api/projects/${projectId}/export/${path}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export échoué');
      }
      const data = await res.json();
      const url = data.downloadUrl || `/api/files/${encodeURIComponent(data.url)}`;
      if (type === 'preview') {
        window.open(url, '_blank', 'noopener');
        toast.success('Aperçu ouvert dans un nouvel onglet (marges et coupures comme à l\'impression)');
      } else {
        window.open(url, '_blank');
        toast.success('Téléchargement démarré');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => doExport('preview')}
        disabled={!!loading || !canExportInterior}
        className="rounded-lg border border-primary-300 bg-primary-50 px-4 py-2 text-left text-primary-800 hover:bg-primary-100 disabled:opacity-50"
        title={!canExportInterior ? 'Générez d\'abord l\'histoire' : 'Ouvre le PDF en aperçu (marges, coupures)'}
      >
        {loading === 'preview' ? 'Génération…' : 'Aperçu avant impression (PDF intérieur)'}
      </button>
      <button
        type="button"
        onClick={() => doExport('interior')}
        disabled={!!loading || !canExportInterior}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-left hover:bg-stone-50 disabled:opacity-50"
        title={!canExportInterior ? 'Générez d\'abord l\'histoire' : undefined}
      >
        {loading === 'interior' ? 'Génération…' : 'Télécharger PDF intérieur'}
      </button>
      <button
        type="button"
        onClick={() => doExport('coverwrap')}
        disabled={!!loading || !canExportCoverwrap}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-left hover:bg-stone-50 disabled:opacity-50"
        title={!canExportCoverwrap ? 'Générez la couverture et la 4e de couverture (section ci-dessus)' : undefined}
      >
        {loading === 'coverwrap' ? 'Génération…' : 'Télécharger PDF couverture (wrap)'}
      </button>
      <button
        type="button"
        onClick={() => doExport('backcover')}
        disabled={!!loading || !canExportBackcover}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-left hover:bg-stone-50 disabled:opacity-50"
        title={!canExportBackcover ? 'Générez la 4e de couverture (section ci-dessus)' : undefined}
      >
        {loading === 'backcover' ? 'Génération…' : 'Télécharger PDF 4e de couverture'}
      </button>
      <button
        type="button"
        onClick={() => doExport('printpack')}
        disabled={!!loading}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-left hover:bg-stone-50 disabled:opacity-50"
      >
        {loading === 'printpack' ? 'Génération…' : 'Télécharger pack impression (ZIP)'}
      </button>
    </div>
  );
}
