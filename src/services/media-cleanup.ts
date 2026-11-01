import type { BackItem, Card } from '@/types/card';
import { deleteCardFile } from '@/utils/card-files';

import { enqueueMediaDeletion } from './db';
import { deleteCachedMedia, isLocalMediaUri } from './media';

type MediaItem = Extract<BackItem, { type: 'photo' | 'audio' }>;

function mediaItems(back: BackItem[]): MediaItem[] {
  return back.filter(
    (item): item is MediaItem => item.type === 'photo' || item.type === 'audio',
  );
}

export async function cleanupRemovedMediaItems(items: BackItem[]): Promise<void> {
  try {
    for (const item of mediaItems(items)) {
      if (isLocalMediaUri(item.uri)) {
        deleteCardFile(item.uri);
        continue;
      }
      await deleteCachedMedia(item.uri);
      await enqueueMediaDeletion([item.uri]);
    }
  } catch {
    // Limpeza é best-effort; a próxima sincronização tenta de novo pelo media_outbox.
  }
}

export async function cleanupDeletedCard(card: Card, userId: string | null): Promise<void> {
  try {
    const items = mediaItems(card.back);
    for (const item of items) {
      if (isLocalMediaUri(item.uri)) {
        deleteCardFile(item.uri);
      } else {
        await deleteCachedMedia(item.uri);
      }
    }
    if (userId) {
      // Marcador de pasta: remove também objetos antigos que não estão no verso.
      await enqueueMediaDeletion([`${userId}/${card.id}/`]);
      return;
    }
    await enqueueMediaDeletion(
      items.filter((item) => !isLocalMediaUri(item.uri)).map((item) => item.uri),
    );
  } catch {
    // Limpeza é best-effort; a próxima sincronização tenta de novo pelo media_outbox.
  }
}
