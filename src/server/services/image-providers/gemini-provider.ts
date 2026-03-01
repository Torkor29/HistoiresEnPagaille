import type { ImageProvider, GenerateImageParams } from './types';
import { generateImage as geminiGenerateImage } from '../gemini-image';
import { isGeminiAvailable } from '../gemini-client';

export const geminiProvider: ImageProvider = {
  id: 'gemini',
  isAvailable: () => isGeminiAvailable(),
  async generateImage(params: GenerateImageParams) {
    return geminiGenerateImage({
      prompt: params.prompt,
      referenceImages: params.referenceImages,
      mode: params.mode,
      aspectRatio: params.aspectRatio,
      requestId: params.requestId,
    });
  },
};
