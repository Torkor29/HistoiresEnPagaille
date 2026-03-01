'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Stepper } from './Stepper';
import { StepPreMadeThemes } from './StepPreMadeThemes';
import { StepChild } from './StepChild';
import { StepTheme } from './StepTheme';
import { StepBookFormat } from './StepBookFormat';
import { StepIdeas } from './StepIdeas';
import { StepImagesAndStyle } from './StepImagesAndStyle';
import { StepGenerate } from './StepGenerate';
import type { ProjectSettings } from '@/lib/schemas';

const WIZARD_DRAFT_KEY = 'histoire-en-pagaille-wizard-draft';
const STEPS = [
  { id: 'inspiration', label: 'Inspiration' },
  { id: 'child', label: 'Enfant' },
  { id: 'theme', label: 'Thème' },
  { id: 'format', label: 'Format livre' },
  { id: 'ideas', label: 'Idées' },
  { id: 'images', label: 'Images & style' },
  { id: 'generate', label: 'Génération' },
];

type WizardClientProps = {
  editProjectId?: string;
  initialSettings?: Partial<ProjectSettings>;
  initialTitle?: string;
};

export default function WizardClient({ editProjectId, initialSettings, initialTitle }: WizardClientProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFresh = searchParams.get('fresh') === '1';
  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(editProjectId ?? null);
  const [settings, setSettings] = useState<Partial<ProjectSettings>>(initialSettings ?? {});
  const [title, setTitle] = useState(initialTitle ?? 'Sans titre');
  const [draftRestored, setDraftRestored] = useState(false);

  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(WIZARD_DRAFT_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const updateSettings = useCallback((partial: Partial<ProjectSettings>) => {
    setSettings((s) => ({ ...s, ...partial }));
  }, []);

  // En mode édition : ne pas écraser avec le brouillon "nouvelle histoire".
  // Restauration / reset du brouillon
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (editProjectId) return;

    // Si on arrive avec ?fresh=1, on veut une vraie nouvelle histoire : on efface le brouillon.
    if (isFresh) {
      clearDraft();
      setDraftRestored(false);
      setSettings({});
      setTitle('Sans titre');
      setStep(0);
      return;
    }

    if (draftRestored) return;
    try {
      const raw = localStorage.getItem(WIZARD_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { settings?: Partial<ProjectSettings>; title?: string; step?: number };
      if (draft.settings && Object.keys(draft.settings).length > 0) {
        setDraftRestored(true);
        setSettings(draft.settings);
        if (draft.title) setTitle(draft.title);
        if (typeof draft.step === 'number' && draft.step >= 0 && draft.step < STEPS.length) setStep(draft.step);
      }
    } catch {
      // ignore
    }
  }, [isFresh, draftRestored, clearDraft, editProjectId]);

  // Sauvegarde automatique du brouillon (clé séparée en mode édition pour ne pas écraser le brouillon "nouvelle histoire")
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = editProjectId ? `${WIZARD_DRAFT_KEY}-edit-${editProjectId}` : WIZARD_DRAFT_KEY;
      localStorage.setItem(key, JSON.stringify({ settings, title, step }));
    } catch {
      // ignore
    }
  }, [settings, title, step, editProjectId]);

  const handleNext = async () => {
    if (step === 0 && !editProjectId && !projectId) {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, settings }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Création échouée');
        }
        const data = await res.json();
        setProjectId(data.id);
        if (data.title) setTitle(data.title);
        clearDraft();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur');
        return;
      }
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSaveAndExit = async () => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, settings }),
      });
      clearDraft();
      toast.success('Projet enregistré');
      router.push(`/p/${projectId}`);
    } catch {
      toast.error('Erreur enregistrement');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-stone-800">
        {editProjectId ? 'Modifier l\'histoire' : 'Nouvelle histoire'}
      </h1>
      {editProjectId && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Vous modifiez les paramètres (enfant, thème, idées, images, format). Enregistrez puis régénérez tout pour remplacer l&apos;histoire, les scènes et les illustrations actuelles.
        </div>
      )}
      {draftRestored && !editProjectId && (
        <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-800">
          Brouillon repéré. Vos données (enfant, thème, idées) ont été restaurées. Vous pouvez reprendre où vous en étiez.
        </div>
      )}
      <Stepper
        steps={STEPS}
        current={step}
        onStepClick={(i) => setStep(i)}
      />
      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <StepPreMadeThemes
            settings={settings}
            updateSettings={updateSettings}
            onNext={handleNext}
          />
        )}
        {step === 1 && (
          <StepChild
            settings={settings}
            updateSettings={updateSettings}
            onNext={handleNext}
            onSaveExit={handleSaveAndExit}
          />
        )}
        {step === 2 && (
          <StepTheme
            settings={settings}
            updateSettings={updateSettings}
            onNext={handleNext}
            onBack={handleBack}
            onSaveExit={projectId ? handleSaveAndExit : undefined}
          />
        )}
        {step === 3 && (
          <StepBookFormat
            settings={settings}
            updateSettings={updateSettings}
            onNext={handleNext}
            onBack={handleBack}
            onSaveExit={projectId ? handleSaveAndExit : undefined}
          />
        )}
        {step === 4 && (
          <StepIdeas
            settings={settings}
            updateSettings={updateSettings}
            onNext={handleNext}
            onBack={handleBack}
            onSaveExit={projectId ? handleSaveAndExit : undefined}
          />
        )}
        {step === 5 && (
          <StepImagesAndStyle
            projectId={projectId}
            settings={settings}
            updateSettings={updateSettings}
            onNext={handleNext}
            onBack={handleBack}
            onSaveExit={projectId ? handleSaveAndExit : undefined}
          />
        )}
        {step === 6 && (
          <StepGenerate
            projectId={projectId}
            settings={settings}
            onBack={handleBack}
            onDone={() => router.push(`/p/${projectId}`)}
            isEditMode={!!editProjectId}
          />
        )}
      </div>
    </div>
  );
}
