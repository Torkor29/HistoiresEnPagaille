import type { ImageProviderId, ImageProvider, GenerateImageParams } from './types';
import { geminiProvider } from './gemini-provider';
import { replicateProvider } from './replicate-provider';
import { localProvider } from './local-provider';

const providers: Record<ImageProviderId, ImageProvider> = {
  gemini: geminiProvider,
  replicate: replicateProvider,
  local: localProvider,
};

export function getImageProvider(id: ImageProviderId): ImageProvider {
  const p = providers[id];
  if (!p) throw new Error(`Provider inconnu : ${id}`);
  return p;
}

const PROVIDER_ORDER: ImageProviderId[] = ['replicate', 'gemini', 'local'];

const PROVIDER_LABELS: Record<ImageProviderId, string> = {
  gemini: 'Google Gemini',
  replicate: 'Replicate — vraies illustrations (recommandé)',
  local: 'Local (Stable Diffusion / Forge sur votre PC)',
};

export function getAvailableProviders(): Array<{ id: ImageProviderId; label: string }> {
  return PROVIDER_ORDER.filter((id) => providers[id].isAvailable()).map((id) => ({
    id,
    label: PROVIDER_LABELS[id],
  }));
}

/** Par défaut : Replicate si dispo (vraies images), sinon Gemini, sinon Local. */
export function getDefaultImageProvider(): ImageProviderId {
  for (const id of PROVIDER_ORDER) {
    if (providers[id].isAvailable()) return id;
  }
  return 'gemini';
}

/** Génère une image avec le provider demandé. */
export async function generateImageWithProvider(
  providerId: ImageProviderId,
  params: GenerateImageParams
): Promise<Buffer> {
  const provider = getImageProvider(providerId);
  if (!provider.isAvailable()) {
    throw new Error(`Le provider "${providerId}" n'est pas configuré. Vérifiez les variables d'environnement.`);
  }
  return provider.generateImage(params);
}

export type { ImageProviderId, ImageProvider, GenerateImageParams } from './types';
