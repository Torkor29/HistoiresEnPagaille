'use client';

import React from 'react';
import type { StepPreMadeThemesViewProps, StoredSynopsis } from './StepPreMadeThemes.types';
import { PreMadeThemesRoot } from './PreMadeThemesRoot';
import { StepPreMadeThemesContent } from './StepPreMadeThemesContent';

export type { StepPreMadeThemesViewProps };

export function StepPreMadeThemesView({
  synopsesByTheme,
  loading,
  regenerating,
  modalTheme,
  onSetModalTheme,
  onRegenerateAll,
  onRegenerateTheme,
  onRegenerateOne,
  onUseStory,
  onNext,
}: StepPreMadeThemesViewProps) {
  const list = (modalTheme ? (synopsesByTheme[modalTheme.id] || []) : []) as StoredSynopsis[];

  return React.createElement(PreMadeThemesRoot, null,
    React.createElement(StepPreMadeThemesContent, {
      list,
      loading,
      regenerating,
      modalTheme,
      onSetModalTheme,
      onRegenerateAll,
      onRegenerateTheme,
      onRegenerateOne,
      onUseStory,
      onNext,
      synopsesByTheme,
    }),
  );
}
