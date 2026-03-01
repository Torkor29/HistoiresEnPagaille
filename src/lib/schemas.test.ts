import { describe, it, expect } from 'vitest';
import {
  childProfileSchema,
  synopsisOutputSchema,
  storyOutputSchema,
  projectSettingsSchema,
} from './schemas';

describe('childProfileSchema', () => {
  it('accepts valid profile', () => {
    const result = childProfileSchema.safeParse({
      firstName: 'Léo',
      age: 6,
      pronouns: 'il',
      interests: ['dinosaures', 'espace'],
      readingLevel: 'normal',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid pronouns', () => {
    const result = childProfileSchema.safeParse({
      firstName: 'Léo',
      age: 6,
      pronouns: 'other',
      interests: [],
      readingLevel: 'normal',
    });
    expect(result.success).toBe(false);
  });
});

describe('synopsisOutputSchema', () => {
  it('accepts valid synopsis', () => {
    const result = synopsisOutputSchema.safeParse({
      title: 'Mon aventure',
      childCharacterName: 'Léo',
      moral: 'Le courage',
      chapters: [
        {
          title: 'Chapitre 1',
          scenes: [
            {
              title: 'Le départ',
              summary: 'Léo part à l\'aventure.',
              visualBeats: [{ sceneIndex: 0, description: 'Enfant devant une forêt', mood: 'aventure' }],
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('storyOutputSchema', () => {
  it('accepts valid story output', () => {
    const result = storyOutputSchema.safeParse({
      fullText: 'Il était une fois...',
      scenes: [
        { order: 0, title: 'Scène 1', text: 'Texte.', imagePrompt: 'Un enfant dans un pré.' },
      ],
    });
    expect(result.success).toBe(true);
  });
});
