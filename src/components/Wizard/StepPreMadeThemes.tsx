'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { PREMADE_THEMES } from '@/lib/premade-themes';
import type { SynopsisOutput } from '@/lib/schemas';
import type { ProjectSettings } from '@/lib/schemas';
import { StepPreMadeThemesView } from './StepPreMadeThemesView';

type ThemeEntry = (typeof PREMADE_THEMES)[number];
type StoredSynopsis = {
  id: string;
  themeId: string;
  themeLabel: string;
  icon: string;
  synopsis: SynopsisOutput;
  sortOrder: number;
};

export function StepPreMadeThemes({
  settings,
  updateSettings,
  onNext,
}: {
  settings: Partial<ProjectSettings>;
  updateSettings: (p: Partial<ProjectSettings>) => void;
  onNext: () => void;
}) {
  const [synopsesByTheme, setSynopsesByTheme] = useState<Record<string, StoredSynopsis[]>>({});
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [modalTheme, setModalTheme] = useState<ThemeEntry | null>(null);

  const loadSynopses = useCallback(async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/premade-themes/synopses', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setSynopsesByTheme(data.synopsesByTheme || {});
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        toast.error('Chargement trop long — réessayez ou vérifiez la connexion.');
      } else {
        toast.error('Impossible de charger les inspirations');
      }
      setSynopsesByTheme({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSynopses();
  }, [loadSynopses]);

  const handleRegenerateAll = async () => {
    setRegenerating('all');
    try {
      const res = await fetch('/api/premade-themes/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'all' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Erreur');
      }
      toast.success('Tous les synopsis sont en cours de génération (cela peut prendre quelques minutes).');
      await loadSynopses();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setRegenerating(null);
    }
  };

  const handleRegenerateTheme = async (themeId: string) => {
    setRegenerating(themeId);
    try {
      const res = await fetch('/api/premade-themes/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'theme', themeId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Erreur');
      }
      toast.success('Synopsis du thème régénérés.');
      await loadSynopses();
      // Garder la modale ouverte pour afficher tout de suite les nouveaux synopsis
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setRegenerating(null);
    }
  };

  const handleRegenerateOne = async (synopsisId: string) => {
    setRegenerating(synopsisId);
    try {
      const res = await fetch('/api/premade-themes/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'one', synopsisId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Erreur');
      }
      toast.success('Synopsis régénéré.');
      await loadSynopses();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setRegenerating(null);
    }
  };

  const handleUseStory = (synopsis: SynopsisOutput) => {
    const themeLabel = modalTheme?.label || settings.theme?.theme || 'Aventure';
    updateSettings({
      theme: {
        theme: themeLabel,
        mood: 'aventure',
        duration: 'moyen',
      },
      premadeSynopsis: JSON.stringify(synopsis),
    });
    setModalTheme(null);
    onNext();
  };

  return (
    <StepPreMadeThemesView
      synopsesByTheme={synopsesByTheme}
      loading={loading}
      regenerating={regenerating}
      modalTheme={modalTheme}
      onSetModalTheme={setModalTheme}
      onRegenerateAll={handleRegenerateAll}
      onRegenerateTheme={handleRegenerateTheme}
      onRegenerateOne={handleRegenerateOne}
      onUseStory={handleUseStory}
      onNext={onNext}
    />
  );
}
