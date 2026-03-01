/**
 * File d'attente par projet : une seule génération (story, illustrations, cover, etc.)
 * à la fois par projet. Les requêtes suivantes attendent la fin de la précédente.
 */

const projectTails = new Map<string, Promise<void>>();

export async function withProjectLock<T>(
  projectId: string,
  fn: () => Promise<T>
): Promise<T> {
  const previous = projectTails.get(projectId) ?? Promise.resolve();
  let release: () => void;
  const ourTurn = new Promise<void>((r) => {
    release = r;
  });
  projectTails.set(projectId, previous.then(() => ourTurn));
  await previous;
  try {
    return await fn();
  } finally {
    release!();
  }
}
