import { Directory, File, Paths } from 'expo-file-system';

import { generateId } from '@/utils/cards';

const CARDS_DIRECTORY = 'card-files';

function ensureCardsDirectory(): Directory {
  const directory = new Directory(Paths.document, CARDS_DIRECTORY);
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  return directory;
}

function extensionFromUri(uri: string, fallback: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(uri);
  return match ? match[1].toLowerCase() : fallback;
}

export async function persistCardFile(sourceUri: string, fallbackExtension: string): Promise<string> {
  const directory = ensureCardsDirectory();
  const extension = extensionFromUri(sourceUri, fallbackExtension);
  const destination = new File(directory, `${generateId()}.${extension}`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}

export function deleteCardFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // O arquivo pode já ter sido removido pelo sistema.
  }
}
