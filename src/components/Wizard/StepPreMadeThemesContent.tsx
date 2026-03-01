'use client';

import React from 'react';
import { PREMADE_THEMES } from '@/lib/premade-themes';

export function StepPreMadeThemesContent(props: any) {
  const {
    synopsesByTheme = {},
    loading,
    regenerating,
    onRegenerateAll,
    onRegenerateTheme,
    onRegenerateOne,
    onUseStory,
    onNext,
    modalTheme,
    onSetModalTheme,
  } = props as any;

  const currentList: any[] = modalTheme
    ? (synopsesByTheme?.[modalTheme.id] || [])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-stone-800">
          Inspirations – histoires préfaites par thème
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Choisis un thème pour partir d&apos;une histoire
          préfaite, puis tu pourras la personnaliser avec le
          prénom de l&apos;enfant.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRegenerateAll}
          disabled={!!regenerating || loading}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {regenerating === 'all' ? 'Génération…' : 'Régénérer tout'}
        </button>
        {loading && (
          <span className="text-sm text-stone-500">
            Chargement des inspirations…
          </span>
        )}
      </div>

      {!loading && Object.keys(synopsesByTheme || {}).length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aucune inspiration en base pour l’instant. Clique sur <strong>Régénérer tout</strong> pour en générer avec l’API (Gemini) — ou exécute une fois le script de seed en local (voir DEPLOY.md) puis recharge.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {loading
          ? PREMADE_THEMES.slice(0, 12).map((t) => (
              <div
                key={t.id}
                className="h-24 animate-pulse rounded-xl bg-stone-100"
              />
            ))
          : PREMADE_THEMES.map((theme) => {
              const list = (synopsesByTheme?.[theme.id] ||
                []) as Array<{ synopsis: unknown }>;
              const count = list.length;
              const disabled = !count || !!regenerating;

              return (
                <button
                  key={theme.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!list.length || !onSetModalTheme) return;
                    onSetModalTheme(theme);
                  }}
                  className="flex flex-col items-center rounded-xl border-2 border-stone-200 bg-gradient-to-b from-white to-stone-50/50 p-4 shadow-sm transition hover:border-primary-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50"
                >
                  <div className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-inner ring-1 ring-stone-100">
                    {theme.icon}
                  </div>
                  <span className="text-center text-sm font-medium text-stone-800">
                    {theme.label}
                  </span>
                  <span className="mt-0.5 text-xs text-stone-500">
                    {count
                      ? `${count} synopsis`
                      : 'Pas encore de synopsis'}
                  </span>
                </button>
              );
            })}
      </div>

      {modalTheme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => onSetModalTheme && onSetModalTheme(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="premade-modal-title"
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
              <h3
                id="premade-modal-title"
                className="flex items-center gap-2 text-lg font-semibold text-stone-800"
              >
                <span className="text-2xl">{modalTheme.icon}</span>
                {modalTheme.label}
              </h3>
              <button
                type="button"
                onClick={() => onSetModalTheme && onSetModalTheme(null)}
                className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
                aria-label="Fermer"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {currentList.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-500">
                  Aucun synopsis pour ce thème pour l&apos;instant.
                  Utilise la régénération pour en créer.
                </p>
              ) : (
                <ul className="space-y-4">
                  {currentList.map((item) => {
                    const it = item as any;
                    const s = it.synopsis || {};
                    const title = s.title as string | undefined;
                    const moral = s.moral as string | undefined;
                    const chapters = (s.chapters || []) as Array<{
                      title?: string;
                    }>;

                    return (
                      <li
                        key={it.id}
                        className="rounded-xl border border-stone-200 bg-stone-50/50 p-4"
                      >
                        <p className="font-semibold text-stone-800">
                          {title || 'Synopsis sans titre'}
                        </p>
                        {moral && (
                          <p className="mt-1 text-xs italic text-stone-600">
                            {moral}
                          </p>
                        )}
                        {chapters.length > 0 && (
                          <ul className="mt-2 list-inside list-disc text-xs text-stone-600">
                            {chapters.slice(0, 4).map((ch, idx) => (
                              <li key={idx}>{ch.title}</li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onUseStory && it.synopsis && onUseStory(it.synopsis)
                            }
                            className="rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
                          >
                            Utiliser ce synopsis
                          </button>
                          <button
                            type="button"
                            disabled={regenerating === it.id}
                            onClick={() =>
                              onRegenerateOne && onRegenerateOne(it.id)
                            }
                            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                          >
                            {regenerating === it.id
                              ? 'Régénération…'
                              : 'Régénérer ce synopsis'}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-200 bg-stone-50 px-4 py-3">
              <button
                type="button"
                disabled={!!regenerating}
                onClick={() =>
                  onRegenerateTheme && onRegenerateTheme(modalTheme.id)
                }
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {regenerating === modalTheme.id
                  ? 'Régénération…'
                  : 'Régénérer ce thème'}
              </button>
              <button
                type="button"
                onClick={() => onSetModalTheme && onSetModalTheme(null)}
                className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between border-t border-stone-200 pt-6">
        <div />
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-600 hover:bg-stone-50"
        >
          Créer sans inspiration
        </button>
      </div>
    </div>
  );
}
