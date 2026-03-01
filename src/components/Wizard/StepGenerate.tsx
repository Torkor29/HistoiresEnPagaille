'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { ProjectSettings } from '@/lib/schemas';

type ImageProviderId = 'gemini' | 'replicate' | 'local';
type ProviderOption = { id: ImageProviderId; label: string };

export function StepGenerate({
  projectId,
  settings,
  onBack,
  onDone,
  isEditMode = false,
}: {
  projectId: string | null;
  settings: Partial<ProjectSettings>;
  onBack: () => void;
  onDone: () => void;
  isEditMode?: boolean;
}) {
  const [step, setStep] = useState<'idle' | 'synopsis' | 'story' | 'illustrations' | 'cover' | 'backcover' | 'done'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [providersFetched, setProvidersFetched] = useState(false);
  const [imageProvider, setImageProvider] = useState<ImageProviderId>('replicate');

  useEffect(() => {
    fetch('/api/image-providers')
      .then((r) => r.ok ? r.json() : [])
      .then((list: ProviderOption[]) => {
        setProviders(list);
        setProvidersFetched(true);
        if (list.length > 0) {
          const preferred = list.find((p) => p.id === 'replicate') ?? list[0];
          setImageProvider(preferred.id);
        }
      })
      .catch(() => {
        setProviders([]);
        setProvidersFetched(true);
      });
  }, []);

  const STEPS_LABELS: Record<string, string> = {
    synopsis: 'Synopsis',
    story: "Rédaction de l'histoire",
    illustrations: 'Illustrations',
    cover: 'Couverture',
    backcover: '4e de couverture',
    done: 'Terminé',
  };
  const STEPS_ORDER = ['synopsis', 'story', 'illustrations', 'cover', 'backcover', 'done'];
  const currentStepIndex = STEPS_ORDER.indexOf(step);

  const run = async (type: 'synopsis' | 'story' | 'illustrations') => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    setStep(type);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (type === 'synopsis') {
        const res = await fetch(`/api/projects/${projectId}/generate/synopsis`, { method: 'POST' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Échec synopsis');
        }
        toast.success('Synopsis généré');
        setStep('story');
        const res2 = await fetch(`/api/projects/${projectId}/generate/story`, { method: 'POST' });
        if (!res2.ok) {
          const data = await res2.json().catch(() => ({}));
          throw new Error(data.error || 'Échec histoire');
        }
        toast.success('Histoire générée');
        setStep('illustrations');
        const res3 = await fetch(`/api/projects/${projectId}/generate/illustrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: settings.hasPhotoRefs ? 'consistency' : 'fast',
            imageProvider,
          }),
        });
        if (!res3.ok) {
          const data = await res3.json().catch(() => ({}));
          throw new Error(data.error || 'Échec illustrations');
        }
        toast.success('Illustrations générées');
        setStep('cover');
        const res4 = await fetch(`/api/projects/${projectId}/generate/cover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res4.ok) {
          const data = await res4.json().catch(() => ({}));
          throw new Error(data.error || 'Échec couverture');
        }
        toast.success('Couverture générée');
        setStep('backcover');
        const res5 = await fetch(`/api/projects/${projectId}/generate/backcover`, { method: 'POST' });
        if (!res5.ok) {
          const data = await res5.json().catch(() => ({}));
          throw new Error(data.error || 'Échec 4e de couverture');
        }
        toast.success('4e de couverture générée');
        setStep('done');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur inconnue';
      setError(message);
      toast.error(message, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div className="rounded-lg bg-amber-50 p-4 text-amber-800">
        Enregistrez d&apos;abord les étapes précédentes (retour puis Suivant).
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stone-800">Génération</h2>
      {isEditMode ? (
        <p className="text-sm text-stone-600">
          Les paramètres modifiés seront enregistrés. En cliquant sur le bouton ci-dessous, vous régénérerez tout (synopsis, histoire, illustrations, couverture). <strong>L&apos;histoire, les scènes et les illustrations actuelles seront remplacées.</strong> Cela peut prendre quelques minutes.
        </p>
      ) : (
        <p className="text-sm text-stone-600">
          Générez le synopsis, l&apos;histoire, les illustrations, la couverture et la 4e de couverture. Cela peut prendre quelques minutes.
        </p>
      )}
      {(providers.length > 0 && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="mb-2 text-sm font-medium text-stone-700">
            Génération des illustrations avec :
          </p>
          {providers.length > 1 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setImageProvider(p.id)}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      imageProvider === p.id
                        ? 'border-primary-500 bg-primary-50 text-primary-800'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {imageProvider === 'gemini' && (
                <p className="mt-2 text-xs text-stone-500">
                  Utilise votre clé GEMINI_API_KEY (Google AI Studio). Génération via Gemini multimodal.
                </p>
              )}
              {imageProvider === 'replicate' && (
                <p className="mt-2 text-xs text-stone-500">
                  Replicate : crédits gratuits à l&apos;inscription, puis ~0,04 €/image. Bonne cohérence de personnage.
                </p>
              )}
              {imageProvider === 'local' && (
                <p className="mt-2 text-xs text-stone-500">
                  Votre serveur (ComfyUI / SD + IP-Adapter) doit être lancé et LOCAL_IMAGE_API_URL configuré.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-600">{providers[0]?.label}</p>
          )}
        </div>
      )) || (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Aucun service d&apos;images configuré. Définissez GEMINI_API_KEY, REPLICATE_API_TOKEN ou LOCAL_IMAGE_API_URL dans .env pour générer les illustrations.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Erreur lors de la génération</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-red-700">
            Vous pouvez cliquer sur &quot;Retour&quot; puis aller voir votre projet : le synopsis et l&apos;histoire ont peut-être bien été générés. Les illustrations pourront être régénérées plus tard depuis chaque scène.
          </p>
        </div>
      )}
      {step === 'idle' && (
        <button
          type="button"
          onClick={() => run('synopsis')}
          disabled={loading || (providersFetched && providers.length === 0)}
          className="rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? 'Génération…' : isEditMode ? 'Enregistrer les paramètres et régénérer tout' : 'Générer tout (synopsis, histoire, illustrations, couverture)'}
        </button>
      )}
      {(step === 'synopsis' || step === 'story' || step === 'illustrations' || step === 'cover' || step === 'backcover') && loading && (
        <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className="bg-primary-500 transition-all duration-500"
              style={{
                width: `${((currentStepIndex + 1) / STEPS_ORDER.length) * 100}%`,
              }}
            />
          </div>
          <p className="text-sm font-medium text-stone-700">
            Étape {currentStepIndex + 1}/{STEPS_ORDER.length} : {STEPS_LABELS[step]}…
          </p>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <span>Génération en cours, ne fermez pas cette page.</span>
          </div>
        </div>
      )}
      {step === 'done' && (
        <div className="rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-medium">Génération terminée.</p>
          <p className="mt-1 text-sm">Vous pouvez consulter votre histoire et exporter le livre.</p>
          <button
            type="button"
            onClick={onDone}
            className="mt-4 rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
          >
            Voir le projet
          </button>
        </div>
      )}
      <div className="flex justify-between border-t border-stone-200 pt-6">
        <button type="button" onClick={onBack} className="text-stone-500 hover:text-stone-700">
          Retour
        </button>
      </div>
    </div>
  );
}
