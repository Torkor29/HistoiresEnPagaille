'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

type CorrectionType = 'tenue' | 'coupe' | 'autre';

const LABELS: Record<CorrectionType, string> = {
  tenue: 'Tenue',
  coupe: 'Coupe de cheveux / perruque',
  autre: 'Autre',
};

export function IllustrationCorrectionForm({
  sceneId,
  initialCorrection,
}: {
  sceneId: string;
  initialCorrection: { type: CorrectionType; detail: string } | null;
}) {
  const [type, setType] = useState<CorrectionType>(initialCorrection?.type ?? 'tenue');
  const [detail, setDetail] = useState(initialCorrection?.detail ?? '');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (initialCorrection) {
      setType(initialCorrection.type);
      setDetail(initialCorrection.detail);
    }
  }, [initialCorrection]);

  const saveCorrection = async () => {
    const payload = !detail.trim()
      ? { illustrationCorrection: null }
      : { illustrationCorrection: { type, detail: detail.trim() } };
    setSaving(true);
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success(
        detail.trim() ? 'Correction enregistrée. Régénérez l\'illustration pour l\'appliquer.' : 'Correction effacée.'
      );
    } catch {
      toast.error('Impossible d\'enregistrer');
    } finally {
      setSaving(false);
    }
  };

  const saveAndRegenerate = async () => {
    const payload = !detail.trim()
      ? { illustrationCorrection: null }
      : { illustrationCorrection: { type, detail: detail.trim() } };
    setRegenerating(true);
    try {
      const patch = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!patch.ok) throw new Error('Erreur enregistrement');
      const res = await fetch(`/api/scenes/${sceneId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageOnly: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec régénération');
      }
      toast.success('Illustration régénérée avec la correction');
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
      <h3 className="mb-2 text-sm font-semibold text-stone-700">
        Signaler un problème sur cette illustration
      </h3>
      <p className="mb-3 text-xs text-stone-600">
        Indiquez ce qui ne va pas ; la correction sera appliquée à la prochaine régénération.
      </p>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-stone-600">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CorrectionType)}
          className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          {(Object.keys(LABELS) as CorrectionType[]).map((k) => (
            <option key={k} value={k}>
              {LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-stone-600">Détail (ex. Soën doit porter le costume bleu à étoiles)</label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Décrivez ce qu'il faut corriger..."
          rows={2}
          className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveCorrection}
          disabled={saving}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer la correction'}
        </button>
        <button
          type="button"
          onClick={saveAndRegenerate}
          disabled={regenerating}
          className="rounded-lg bg-primary-500 px-3 py-2 text-sm text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {regenerating ? 'Régénération…' : 'Enregistrer et régénérer l\'illustration'}
        </button>
      </div>
    </div>
  );
}
