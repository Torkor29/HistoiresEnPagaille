'use client';

import { useState, useCallback, useRef } from 'react';
import { BookPreview, type BookPage } from '@/components/BookPreview';

export function ReadView({
  bookPages,
  children,
}: {
  bookPages: BookPage[];
  children: React.ReactNode;
}) {
  const [viewMode, setViewMode] = useState<'book' | 'scroll'>('book');
  const [spreadMode, setSpreadMode] = useState(true);
  const [ttsText, setTtsText] = useState('');
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const handleCurrentPagesChange = useCallback((_pages: BookPage[], text: string) => {
    setTtsText(text);
  }, []);

  const handleReadAloud = useCallback(() => {
    if (!ttsText.trim()) return;
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) return;
    synthRef.current = synth;
    if (ttsPlaying) {
      synth.cancel();
      setTtsPlaying(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(ttsText);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    u.onend = () => setTtsPlaying(false);
    u.onerror = () => setTtsPlaying(false);
    synth.speak(u);
    setTtsPlaying(true);
  }, [ttsText, ttsPlaying]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('book')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                viewMode === 'book' ? 'bg-white text-stone-800 shadow' : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              Aperçu livre
            </button>
            <button
              type="button"
              onClick={() => setViewMode('scroll')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                viewMode === 'scroll' ? 'bg-white text-stone-800 shadow' : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              Vue défilement
            </button>
          </div>
          {viewMode === 'book' && (
            <button
              type="button"
              onClick={() => setSpreadMode((s) => !s)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                spreadMode ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              Livre ouvert
            </button>
          )}
          {viewMode === 'book' && (
            <button
              type="button"
              onClick={handleReadAloud}
              disabled={!ttsText.trim()}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                ttsPlaying ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              } disabled:opacity-50`}
              title="Lire à voix haute (synthèse vocale)"
            >
              <span aria-hidden>{ttsPlaying ? '⏹' : '🔊'}</span>
              {ttsPlaying ? 'Arrêter' : 'Lire à voix haute'}
            </button>
          )}
        </div>
      </div>
      {viewMode === 'book' ? (
        <BookPreview
          pages={bookPages}
          spreadMode={spreadMode}
          onCurrentPagesChange={handleCurrentPagesChange}
        />
      ) : (
        <article className="space-y-10">{children}</article>
      )}
    </div>
  );
}
