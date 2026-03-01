'use client';

import { useState } from 'react';
import type { Theme, ProjectSettings } from '@/lib/schemas';

const MOODS = [
  { value: 'drôle' as const, label: 'Drôle' },
  { value: 'aventure' as const, label: 'Aventure' },
  { value: 'rassurant' as const, label: 'Rassurant' },
  { value: 'mystérieux' as const, label: 'Mystérieux' },
  { value: 'éducatif' as const, label: 'Éducatif' },
];
const DURATIONS = [
  { value: 'court' as const, label: 'Court (3–5 min)' },
  { value: 'moyen' as const, label: 'Moyen (7–10 min)' },
  { value: 'long' as const, label: 'Long (12–15 min)' },
];
const THEME_SUGGESTIONS = ['Pirates', 'Espace', 'Licornes', 'Football', 'Magie', 'Enquête', 'Dinosaures', 'Forêt'];

export function StepTheme({
  settings,
  updateSettings,
  onNext,
  onBack,
  onSaveExit,
}: {
  settings: Partial<ProjectSettings>;
  updateSettings: (p: Partial<ProjectSettings>) => void;
  onNext: () => void;
  onBack: () => void;
  onSaveExit?: () => void;
}) {
  const theme = (settings.theme || {}) as Partial<Theme>;
  const [themeText, setThemeText] = useState(theme.theme ?? '');
  const [mood, setMood] = useState<Theme['mood']>(theme.mood ?? 'aventure');
  const [duration, setDuration] = useState<Theme['duration']>(theme.duration ?? 'moyen');

  const apply = () => {
    updateSettings({
      theme: {
        theme: themeText.trim() || 'Aventure',
        mood,
        duration,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stone-800">Thème de l&apos;histoire</h2>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Thème principal</label>
        <input
          type="text"
          value={themeText}
          onChange={(e) => setThemeText(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="ex. Pirates, Espace, Licornes"
        />
        <p className="mt-1 text-xs text-stone-500">Suggestions : {THEME_SUGGESTIONS.join(', ')}</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Ambiance</label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${mood === m.value ? 'bg-primary-500 text-white' : 'bg-stone-100'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Durée</label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${duration === d.value ? 'bg-primary-500 text-white' : 'bg-stone-100'}`}
            >
              {d.label}
            </button>
          ))}
        </div>
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
