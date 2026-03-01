'use client';

type Step = { id: string; label: string };

export function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: Step[];
  current: number;
  onStepClick: (i: number) => void;
}) {
  return (
    <nav aria-label="Étapes" className="flex flex-wrap gap-2">
      {steps.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onStepClick(i)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            i === current
              ? 'bg-primary-500 text-white'
              : i < current
                ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {i + 1}. {s.label}
        </button>
      ))}
    </nav>
  );
}
