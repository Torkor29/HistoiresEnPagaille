'use client';

import { useState, useEffect, useCallback } from 'react';

export type BookPage =
  | { type: 'cover'; title: string; subtitle?: string; imageUrl: string | null }
  | { type: 'text'; title?: string; text: string }
  | { type: 'illustration'; imageUrl: string; title?: string }
  | { type: 'mixed'; title?: string; text: string; imageUrl: string }
  | { type: 'backcover'; text: string };

function getPageText(p: BookPage): string {
  if (p.type === 'cover') return [p.title, p.subtitle].filter(Boolean).join(' — ') || '';
  if (p.type === 'text') return [p.title, p.text].filter(Boolean).join('\n\n') || '';
  if (p.type === 'backcover') return p.text || '';
  if (p.type === 'mixed') return [p.title, p.text].filter(Boolean).join('\n\n') || '';
  return '';
}

export function BookPreview({
  pages,
  aspectRatio = '148/210',
  spreadMode = false,
  onCurrentPagesChange,
}: {
  pages: BookPage[];
  aspectRatio?: string;
  spreadMode?: boolean;
  onCurrentPagesChange?: (pages: BookPage[], textForTts: string) => void;
}) {
  const step = spreadMode ? 2 : 1;
  const maxIndex = Math.max(0, pages.length - 1);
  const [currentIndex, setCurrentIndex] = useState(0);

  const leftIndex = spreadMode ? Math.min(currentIndex, pages.length - 1) : currentIndex;
  const rightIndex = spreadMode && currentIndex + 1 < pages.length ? currentIndex + 1 : null;

  useEffect(() => {
    if (!onCurrentPagesChange || pages.length === 0) return;
    const left = pages[leftIndex];
    const right = rightIndex !== null ? pages[rightIndex] : null;
    const currentPages = [left, right].filter((p): p is BookPage => p !== null);
    const text = currentPages.map(getPageText).join('\n\n');
    onCurrentPagesChange(right !== null ? [left, right] : [left], text);
  }, [leftIndex, rightIndex, pages, onCurrentPagesChange]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - step));
  }, [step]);
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(maxIndex, i + step));
  }, [maxIndex, step]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPrev, goNext]);

  if (pages.length === 0) return null;

  const [w, h] = aspectRatio.split('/').map(Number);
  const singleAspect = w && h ? `${w}/${h}` : '148/210';

  const renderPageContent = (p: BookPage) => {
    if (p.type === 'cover')
      return (
        <div className="relative h-full w-full overflow-hidden bg-stone-100">
          {p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-400">
              Pas de couverture
            </div>
          )}
          {(p.title || p.subtitle) && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 text-center">
              <h2 className="text-base font-bold text-white drop-shadow sm:text-lg">{p.title}</h2>
              {p.subtitle && <p className="mt-0.5 text-xs text-white/90">{p.subtitle}</p>}
            </div>
          )}
        </div>
      );
    if (p.type === 'text')
      return (
        <div className="flex h-full w-full flex-col overflow-auto px-5 py-6">
          {p.title && <h3 className="mb-3 text-sm font-semibold text-stone-800">{p.title}</h3>}
          <div className="prose prose-stone prose-sm max-w-none flex-1 text-stone-700 leading-relaxed">
            {p.text.split(/\n\n/).map((para, i) => (
              <p key={i} className="mb-3 last:mb-0">{para}</p>
            ))}
          </div>
        </div>
      );
    if (p.type === 'illustration')
      return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden bg-stone-50">
          <img src={p.imageUrl} alt="" className="h-full w-full object-contain" />
        </div>
      );
    if (p.type === 'mixed')
      return (
        <div className="flex h-full w-full flex-col gap-2">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt="" className="w-full flex-shrink-0 object-contain" style={{ maxHeight: '50%' }} />
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            {p.title && <h3 className="mb-0.5 text-xs font-semibold text-stone-800">{p.title}</h3>}
            <div className="prose prose-stone prose-sm max-w-none flex-1 text-stone-700">
              {p.text.split(/\n\n/).map((para, i) => (
                <p key={i} className="mb-0.5 last:mb-0">{para}</p>
              ))}
            </div>
          </div>
        </div>
      );
    if (p.type === 'backcover')
      return (
        <div className="flex h-full w-full flex-col overflow-auto">
          <p className="text-xs font-medium text-stone-500">4e de couverture</p>
          <div className="prose prose-stone prose-sm mt-1 max-w-none flex-1 text-stone-700">
            {p.text.split(/\n\n/).map((para, i) => (
              <p key={i} className="mb-1">{para}</p>
            ))}
          </div>
        </div>
      );
    return null;
  };

  const leftPage = pages[leftIndex];
  const rightPage = rightIndex !== null ? pages[rightIndex] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="flex w-full max-w-4xl justify-center gap-2 sm:gap-4"
        style={{
          aspectRatio: spreadMode && rightPage ? `${Number(w) * 2 + 0.5}/${h}` : singleAspect,
          maxWidth: spreadMode && rightPage ? 'none' : '28rem',
        }}
      >
        <div
          className="relative flex flex-1 items-stretch overflow-hidden rounded-lg border border-stone-300 bg-stone-100 shadow-lg"
          style={{
            aspectRatio: singleAspect,
            maxWidth: spreadMode && rightPage ? '50%' : undefined,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
            {renderPageContent(leftPage)}
          </div>
        </div>
        {spreadMode && rightPage && (
          <div
            className="relative flex flex-1 items-stretch overflow-hidden rounded-lg border border-stone-300 bg-stone-100 shadow-lg"
            style={{ aspectRatio: singleAspect, maxWidth: '50%' }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
              {renderPageContent(rightPage)}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          ← {spreadMode ? 'Double page précédente' : 'Page précédente'}
        </button>
        <span className="text-sm text-stone-500">
          {currentIndex + 1}–{spreadMode && rightPage ? currentIndex + 2 : currentIndex + 1} / {pages.length}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex >= maxIndex}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          {spreadMode ? 'Double page suivante' : 'Page suivante'} →
        </button>
      </div>
    </div>
  );
}
