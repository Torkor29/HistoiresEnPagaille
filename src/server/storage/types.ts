export interface StorageProvider {
  /** Enregistre un fichier et retourne l'URL (ou chemin relatif) pour le retrouver. */
  upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<string>;

  /** Retourne l'URL signée ou le chemin pour accéder au fichier. */
  getUrl(key: string): Promise<string>;

  /** Supprime un fichier (optionnel). */
  delete?(key: string): Promise<void>;
}
