'use client';

import { useState } from 'react';
import type { BookFormatChoice, ProjectSettings } from '@/lib/schemas';

const FORMATS: Array<{ id: BookFormatChoice['formatId']; label: string; hint: string }> = [
  { id: 'a4', label: 'A4 (210×297 mm)', hint: 'Album illustré' },
  { id: 'a5', label: 'A5 (148×210 mm)', hint: 'Roman jeunesse' },
  { id: 'us-letter', label: 'US Letter (8.5×11")', hint: 'États-Unis' },
  { id: '8x8', label: '8×8" carré', hint: 'Album carré' },
  { id: '6x9', label: '6×9"', hint: 'Roman illustré' },
  { id: '8.5x8.5', label: '8.5×8.5" grand carré', hint: 'Album grand carré' },
];

export function StepBookFormat({
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
  const book = (settings.bookFormat || {}) as Partial<BookFormatChoice>;
  const [formatId, setFormatId] = useState<BookFormatChoice['formatId']>(book.formatId ?? 'a4');
  const [bleedMm, setBleedMm] = useState(book.bleedMm ?? 3);
  const [safeMarginMm, setSafeMarginMm] = useState(book.safeMarginMm ?? 5);

  const apply = () => {
    updateSettings({
      bookFormat: {
        formatId,
        bleedMm,
        safeMarginMm,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stone-800">Format du livre</h2>
      <p className="text-sm text-stone-600">
        Choisissez un format standard pour l&apos;impression. Les marges et le fond perdu seront appliqués à l&apos;export.
      </p>
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-600">Format</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormatId(f.id)}
              className={`rounded-lg border p-3 text-left text-sm ${formatId === f.id ? 'border-primary-500 bg-primary-50' : 'border-stone-200'}`}
            >
              <span className="font-medium">{f.label}</span>
              <span className="mt-1 block text-stone-500">{f.hint}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600">Fond perdu (mm)</label>
          <input
            type="number"
            min={0}
            max={10}
            value={bleedMm}
            onChange={(e) => setBleedMm(Number(e.target.value))}
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600">Marge de sécurité (mm)</label>
          <input
            type="number"
            min={2}
            max={15}
            value={safeMarginMm}
            onChange={(e) => setSafeMarginMm(Number(e.target.value))}
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
          />
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
