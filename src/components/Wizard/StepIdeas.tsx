'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CustomIdeas, ProjectSettings } from '@/lib/schemas';

export function StepIdeas({
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
  const ideas = (settings.ideas || {}) as Partial<CustomIdeas>;
  const [secondary, setSecondary] = useState(ideas.secondaryCharacters ?? '');
  const [location, setLocation] = useState(ideas.location ?? '');
  const [magic, setMagic] = useState(ideas.magicObjectOrMission ?? '');
  const [moral, setMoral] = useState(ideas.moral ?? '');
  const [vocabulary, setVocabulary] = useState(ideas.vocabulary?.join(', ') ?? '');
  const [suggestLoading, setSuggestLoading] = useState(false);

  const handleSuggestIdeas = async () => {
    setSuggestLoading(true);
    try {
      const res = await fetch('/api/premade-themes/suggest-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child: settings.child,
          theme: (settings.theme as { theme?: string })?.theme ?? 'aventure',
          synopsis: (settings as { premadeSynopsis?: string }).premadeSynopsis ?? undefined,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      const list = data.ideas as Array<{ moral?: string; location?: string; magicObjectOrMission?: string }>;
      if (list?.length > 0) {
        const first = list[0];
        if (first.moral) setMoral(first.moral);
        if (first.location) setLocation(first.location);
        if (first.magicObjectOrMission) setMagic(first.magicObjectOrMission);
        updateSettings({
          ideas: {
            ...ideas,
            moral: first.moral ?? moral,
            location: first.location ?? location,
            magicObjectOrMission: first.magicObjectOrMission ?? magic,
          },
        });
        toast.success('Idées proposées ! Vous pouvez en choisir une ou modifier.');
      }
    } catch {
      toast.error('Impossible de générer des idées');
    } finally {
      setSuggestLoading(false);
    }
  };

  const apply = () => {
    updateSettings({
      ideas: {
        secondaryCharacters: secondary.trim() || undefined,
        location: location.trim() || undefined,
        magicObjectOrMission: magic.trim() || undefined,
        moral: moral.trim() || undefined,
        vocabulary: vocabulary.split(',').map((s) => s.trim()).filter(Boolean),
      },
    });
  };

  const hasPremadeSynopsis = !!(settings as { premadeSynopsis?: string }).premadeSynopsis;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stone-800">Idées précises (optionnel)</h2>
      <p className="text-sm text-stone-600">
        Personnages secondaires, lieu, morale ou mots de vocabulaire à inclure.
      </p>
      {hasPremadeSynopsis && (
        <p className="rounded-lg border border-primary-200 bg-primary-50/50 px-3 py-2 text-sm text-primary-800">
          Vous avez choisi un synopsis : les idées proposées seront cohérentes avec cette histoire (lieux, objet, morale).
        </p>
      )}
      <button
        type="button"
        onClick={handleSuggestIdeas}
        disabled={suggestLoading}
        className="rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100 disabled:opacity-50"
      >
        {suggestLoading ? 'Génération…' : '✨ Me proposer des idées'}
      </button>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Personnages secondaires</label>
        <input
          type="text"
          value={secondary}
          onChange={(e) => setSecondary(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="ex. un perroquet, un vieux marin"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Lieu</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="ex. une île tropicale"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Objet magique / mission</label>
        <input
          type="text"
          value={magic}
          onChange={(e) => setMagic(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="ex. une carte au trésor"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Morale souhaitée</label>
        <input
          type="text"
          value={moral}
          onChange={(e) => setMoral(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="ex. le courage et l'amitié"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">Mots de vocabulaire à inclure</label>
        <input
          type="text"
          value={vocabulary}
          onChange={(e) => setVocabulary(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="ex. trésor, boussole, équipage"
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
