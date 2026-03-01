'use client';

import { useState } from 'react';
import type { ChildProfile, ProjectSettings } from '@/lib/schemas';

const PRONOUNS = [
  { value: 'il' as const, label: 'Il' },
  { value: 'elle' as const, label: 'Elle' },
  { value: 'iel' as const, label: 'Iel' },
];
const READING_LEVELS = [
  { value: 'facile' as const, label: 'Facile' },
  { value: 'normal' as const, label: 'Normal' },
  { value: 'avancé' as const, label: 'Avancé' },
];

export function StepChild({
  settings,
  updateSettings,
  onNext,
  onSaveExit,
}: {
  settings: Partial<ProjectSettings>;
  updateSettings: (p: Partial<ProjectSettings>) => void;
  onNext: () => void;
  onSaveExit?: () => void;
}) {
  const child = (settings.child || {}) as Partial<ChildProfile>;
  const [firstName, setFirstName] = useState(child.firstName ?? '');
  const [age, setAge] = useState(child.age ?? 6);
  const [pronouns, setPronouns] = useState<ChildProfile['pronouns']>(child.pronouns ?? 'il');
  const [interests, setInterests] = useState(child.interests?.join(', ') ?? '');
  const [readingLevel, setReadingLevel] = useState<ChildProfile['readingLevel']>(child.readingLevel ?? 'normal');
  const [avoid, setAvoid] = useState(child.avoid?.join(', ') ?? '');
  const [values, setValues] = useState(child.values?.join(', ') ?? '');

  const apply = () => {
    updateSettings({
      child: {
        firstName: firstName.trim() || 'Enfant',
        age: Number(age) || 6,
        pronouns,
        interests: interests.split(',').map((s) => s.trim()).filter(Boolean),
        readingLevel,
        avoid: avoid.split(',').map((s) => s.trim()).filter(Boolean),
        values: values.split(',').map((s) => s.trim()).filter(Boolean),
      },
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stone-800">Profil de l&apos;enfant</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600">Prénom</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
            placeholder="Léo"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600">Âge</label>
          <input
            type="number"
            min={1}
            max={16}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Pronoms</label>
        <div className="flex gap-2">
          {PRONOUNS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPronouns(p.value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${pronouns === p.value ? 'bg-primary-500 text-white' : 'bg-stone-100'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Centres d&apos;intérêt (séparés par des virgules)</label>
        <input
          type="text"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="dinosaures, espace, chevaliers"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Niveau de lecture</label>
        <div className="flex gap-2">
          {READING_LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setReadingLevel(l.value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${readingLevel === l.value ? 'bg-primary-500 text-white' : 'bg-stone-100'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">À éviter (thèmes, peurs)</label>
        <input
          type="text"
          value={avoid}
          onChange={(e) => setAvoid(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="violence, noirceur"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Valeurs à transmettre</label>
        <input
          type="text"
          value={values}
          onChange={(e) => setValues(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="gentillesse, courage, partage"
        />
      </div>
      <div className="flex justify-between border-t border-stone-200 pt-6">
        <div>
          {onSaveExit && (
            <button type="button" onClick={onSaveExit} className="text-stone-500 hover:text-stone-700">
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
