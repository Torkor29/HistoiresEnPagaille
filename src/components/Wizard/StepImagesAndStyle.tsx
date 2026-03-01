'use client';

import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Style, ProjectSettings } from '@/lib/schemas';

const VISUAL_STYLES = [
  { value: 'animé' as const, label: 'Animé' },
  { value: 'animation_familiale' as const, label: 'Animation familiale' },
  { value: 'manga' as const, label: 'Manga' },
  { value: 'minimaliste' as const, label: 'Minimaliste' },
  { value: 'mignon' as const, label: 'Mignon' },
  { value: 'aquarelle' as const, label: 'Aquarelle' },
  { value: 'storybook_pastel' as const, label: 'Livre pastel' },
  { value: 'conte_cinématographique' as const, label: 'Conte cinématographique' },
];
const FORMATS = [
  { value: 'carre' as const, label: 'Carré' },
  { value: 'portrait' as const, label: 'Portrait' },
  { value: 'paysage' as const, label: 'Paysage' },
];

type AssetRef = { id: string; type: string; url: string; metadata: string | null };
type PendingFile = { file: File; characterName: string };

function getCharacterLabel(name: string): string {
  if (name === '__tenue__') return 'Tenue (déguisement)';
  return name;
}

export function StepImagesAndStyle({
  projectId,
  settings,
  updateSettings,
  onNext,
  onBack,
  onSaveExit,
}: {
  projectId: string | null;
  settings: Partial<ProjectSettings>;
  updateSettings: (p: Partial<ProjectSettings>) => void;
  onNext: () => void;
  onBack: () => void;
  onSaveExit?: () => void;
}) {
  const style = (settings.style || {}) as Partial<Style>;
  const [visualStyle, setVisualStyle] = useState<Style['visualStyle']>(style.visualStyle ?? 'storybook_pastel');
  const [format, setFormat] = useState<Style['format']>(style.format ?? 'portrait');
  const [resemblanceLevel, setResemblanceLevel] = useState(style.resemblanceLevel ?? 80);
  const [uploading, setUploading] = useState(false);
  const [photoRefs, setPhotoRefs] = useState<AssetRef[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const childName = settings.child?.firstName || 'Enfant';
  const characterOptions = [
    { value: childName, label: `${childName} (enfant principal)` },
    { value: 'Sœur', label: 'Sœur' },
    { value: 'Frère', label: 'Frère' },
    { value: 'Maman', label: 'Maman' },
    { value: 'Papa', label: 'Papa' },
    { value: 'Autre proche', label: 'Autre adulte / proche' },
    { value: '__tenue__', label: 'Tenue (déguisement)' },
  ];

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((project) => {
        if (project?.assets) {
          const refs = project.assets.filter(
            (a: AssetRef) => a.type === 'PHOTO_REF' || a.type === 'CHARACTER_REF'
          );
          setPhotoRefs(refs);
        }
      })
      .catch(() => {});
  }, [projectId]);

  const apply = () => {
    updateSettings({
      style: {
        visualStyle,
        format,
        resemblanceLevel,
      },
      hasPhotoRefs: photoRefs.length > 0,
      hasOutfitPhoto: photoRefs.some((a) => {
        try {
          const m = a.metadata ? JSON.parse(a.metadata) as { characterName?: string } : {};
          return m.characterName === 'Tenue';
        } catch { return false; }
      }),
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !projectId) return;
    const firstChar = characterOptions[0].value;
    setPendingFiles(files.map((file) => ({ file, characterName: firstChar })));
    toast.success(`${files.length} fichier(s) sélectionné(s) — associez chaque photo à un personnage puis cliquez "Déposer".`);
    if (inputRef.current) inputRef.current.value = '';
  };

  const setPendingCharacter = (index: number, characterName: string) => {
    setPendingFiles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, characterName };
      return next;
    });
  };

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPending = async () => {
    if (!projectId || pendingFiles.length === 0) return;
    setUploading(true);
    let ok = 0;
    try {
      for (const { file, characterName } of pendingFiles) {
        const form = new FormData();
        form.append('file', file);
        form.append('type', 'PHOTO_REF');
        if (characterName && characterName !== '__tenue__') form.append('characterName', characterName);
        if (characterName === '__tenue__') form.append('characterName', 'Tenue');
        const res = await fetch(`/api/projects/${projectId}/assets`, { method: 'POST', body: form });
        if (res.ok) {
          ok++;
          const data = await res.json();
          setPhotoRefs((prev) => [
            ...prev,
            {
              id: data.id,
              type: data.type,
              url: data.url,
              metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            },
          ]);
        }
      }
      setPendingFiles([]);
      if (ok) toast.success(`${ok} photo(s) déposée(s).`);
      if (ok < pendingFiles.length) toast.error('Certains dépôts ont échoué.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setUploading(false);
    }
  };

  const removeRef = async (assetId: string) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/assets/${assetId}`, { method: 'DELETE' });
      if (res.ok) {
        setPhotoRefs((prev) => prev.filter((a) => a.id !== assetId));
        toast.success('Photo retirée.');
      }
    } catch {
      toast.error('Impossible de retirer.');
    }
  };

  const getCharacterFromMetadata = (metadata: string | null): string => {
    if (!metadata) return '—';
    try {
      const m = JSON.parse(metadata) as { characterName?: string };
      return m.characterName ? getCharacterLabel(m.characterName) : '—';
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stone-800">Images & style</h2>
      {projectId && (
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600">
            Photos de référence — associez chaque photo à un personnage
          </label>
          <p className="mb-2 text-xs text-amber-700">
            Consentement parent requis. Déposez plusieurs photos (enfant, autres personnages, tenue). Choisissez à qui correspond chaque image dans la liste ci-dessous.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="block w-full text-sm text-stone-600 file:mr-4 file:rounded file:border-0 file:bg-primary-100 file:px-4 file:py-2 file:text-primary-700"
          />

          {pendingFiles.length > 0 && (
            <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50/50 p-3">
              <p className="mb-2 text-sm font-medium text-stone-700">
                {pendingFiles.length} fichier(s) prêt(s) — choisissez le personnage pour chacun puis déposez.
              </p>
              <ul className="space-y-2">
                {pendingFiles.map((pf, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="truncate text-stone-600">{pf.file.name}</span>
                    <select
                      value={pf.characterName}
                      onChange={(e) => setPendingCharacter(i, e.target.value)}
                      className="rounded border border-stone-300 bg-white px-2 py-1 text-stone-700"
                    >
                      {characterOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removePending(i)}
                      className="text-red-600 hover:underline"
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={uploadPending}
                disabled={uploading}
                className="mt-2 rounded bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {uploading ? 'Dépôt…' : `Déposer les ${pendingFiles.length} photo(s)`}
              </button>
            </div>
          )}

          {photoRefs.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-stone-700">Photos déposées</p>
              <ul className="flex flex-wrap gap-3">
                {photoRefs.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-col items-center rounded-lg border border-stone-200 bg-stone-50 p-2"
                  >
                    <img
                      src={`/api/files/${encodeURIComponent(a.url)}`}
                      alt=""
                      className="h-20 w-20 rounded object-cover"
                    />
                    <span className="mt-1 text-xs text-stone-600">
                      {getCharacterFromMetadata(a.metadata)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRef(a.id)}
                      className="mt-1 text-xs text-red-600 hover:underline"
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-600">Style visuel</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VISUAL_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setVisualStyle(s.value)}
              className={`rounded-lg border p-2 text-sm ${visualStyle === s.value ? 'border-primary-500 bg-primary-50' : 'border-stone-200'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Format illustration</label>
        <div className="flex gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormat(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${format === f.value ? 'bg-primary-500 text-white' : 'bg-stone-100'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">
          Niveau de ressemblance : {resemblanceLevel}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={resemblanceLevel}
          onChange={(e) => setResemblanceLevel(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="flex justify-between border-t border-stone-200 pt-6">
        <div>
          <button type="button" onClick={onBack} className="text-stone-500 hover:text-stone-700">
            Retour
          </button>
          {onSaveExit && (
            <button type="button" onClick={onSaveExit} className="ml-4 text-stone-500 hover:text-stone-700">
              Enregistrer et quitter
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => { apply(); onNext(); }}
          className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
