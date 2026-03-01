import type { SynopsisOutput } from '@/lib/schemas';
import { PREMADE_THEMES } from '@/lib/premade-themes';

export type ThemeEntry = (typeof PREMADE_THEMES)[number];
export type StoredSynopsis = {
  id: string;
  themeId: string;
  themeLabel: string;
  icon: string;
  synopsis: SynopsisOutput;
  sortOrder: number;
};

export type StepPreMadeThemesViewProps = {
  synopsesByTheme: { [key: string]: StoredSynopsis[] };
  loading: boolean;
  regenerating: string | null;
  modalTheme: ThemeEntry | null;
  onSetModalTheme: (theme: ThemeEntry | null) => void;
  onRegenerateAll: () => void;
  onRegenerateTheme: (themeId: string) => void;
  onRegenerateOne: (synopsisId: string) => void;
  onUseStory: (synopsis: SynopsisOutput) => void;
  onNext: () => void;
};
