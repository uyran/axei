import { File } from 'expo-file-system';

import type { BackItem, Card } from '@/types/card';
import { deleteCardFile } from '@/utils/card-files';
import {
  deleteCardRowLocal,
  getMeta,
  isCardDirty,
  loadCardLocal,
  loadCardsLocal,
  loadMediaOutbox,
  loadOutbox,
  markCardClean,
  removeMediaOutboxEntry,
  removeOutboxEntry,
  replaceCardLocalClean,
  serialize,
  setMeta,
  updateCardBackLocal,
} from './db';
import {
  cacheLocalCopy,
  isLocalMediaUri,
  removeStorageFolder,
  removeStorageObjects,
  uploadCardMedia,
} from './media';
import { supabase } from './supabase';

const EPOCH = '1970-01-01T00:00:00.000Z';

type RemoteCardRow = {
  id: string;
  name: string;
  favorite: boolean;
  background_seed: number;
  front: string;
  back: unknown;
  created_at: string;
  updated_at: string;
};

export type SyncResult = {
  pulled: Card[];
  deletedIds: string[];
  pullSucceeded: boolean;
};

function parseBack(value: unknown): BackItem[] {
  return Array.isArray(value) ? (value as BackItem[]) : [];
}

function toPayload(card: Card, userId: string) {
  return {
    id: card.id,
    user_id: userId,
    name: card.name,
    favorite: card.favorite,
    background_seed: card.backgroundSeed,
    front: card.front,
    back: card.back,
    created_at: card.createdAt,
  };
}

function extensionFromUri(uri: string, fallback: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(uri);
  return match ? match[1].toLowerCase() : fallback;
}

function contentTypeFor(extension: string): string {
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'm4a') return 'audio/m4a';
  if (extension === 'mp3') return 'audio/mpeg';
  if (extension === 'wav') return 'audio/wav';
  if (extension === 'aac') return 'audio/aac';
  return 'application/octet-stream';
}

async function uploadPendingMedia(
  userId: string,
  card: Card,
): Promise<{ back: BackItem[]; changed: boolean; originals: string[] }> {
  let changed = false;
  const back: BackItem[] = [];
  const originals: string[] = [];
  for (const item of card.back) {
    if ((item.type === 'photo' || item.type === 'audio') && isLocalMediaUri(item.uri)) {
      const source = new File(item.uri);
      if (!source.exists) {
        // Arquivo local sumiu (item quebrado): remove para destravar a fila.
        console.warn('[sync] mídia local ausente — item descartado', item.id, item.uri);
        changed = true;
        continue;
      }
      const extension = extensionFromUri(item.uri, item.type === 'photo' ? 'jpg' : 'm4a');
      const storagePath = `${userId}/${card.id}/${item.id}.${extension}`;
      await uploadCardMedia(item.uri, storagePath, contentTypeFor(extension));
      const cached = await cacheLocalCopy(item.uri, `${item.id}.${extension}`);
      if (cached) {
        // A cópia em media-cache substitui o original; apagar só após o envio.
        originals.push(item.uri);
      }
      back.push({ ...item, uri: storagePath });
      changed = true;
    } else {
      back.push(item);
    }
  }
  return { back, changed, originals };
}

async function flushMediaOutbox(): Promise<void> {
  const entries = await loadMediaOutbox();
  for (const storagePath of entries) {
    try {
      if (storagePath.endsWith('/')) {
        await removeStorageFolder(storagePath);
      } else {
        await removeStorageObjects([storagePath]);
      }
      await removeMediaOutboxEntry(storagePath);
      console.debug('[sync] mídia removida', storagePath);
    } catch (error) {
      // Mantém na fila; retry na próxima sincronização.
      console.warn('[sync] falha ao remover mídia', storagePath, error);
    }
  }
}

async function flushOutbox(userId: string): Promise<void> {
  const entries = await loadOutbox();
  for (const entry of entries) {
    try {
      if (entry.op === 'delete') {
        const { error } = await supabase.from('cards').delete().eq('id', entry.card_id);
        if (error) {
          throw new Error(error.message);
        }
        await removeOutboxEntry(entry.card_id);
        console.debug('[sync] delete enviado', entry.card_id);
        continue;
      }
      const card = await loadCardLocal(entry.card_id);
      if (!card) {
        await removeOutboxEntry(entry.card_id);
        continue;
      }
      const { back, changed, originals } = await uploadPendingMedia(userId, card);
      if (changed) {
        await updateCardBackLocal(card.id, back);
      }
      const { error } = await supabase
        .from('cards')
        .upsert(toPayload({ ...card, back }, userId), { onConflict: 'id' });
      if (error) {
        throw new Error(error.message);
      }
      for (const original of originals) {
        deleteCardFile(original);
      }
      await removeOutboxEntry(entry.card_id);
      await markCardClean(card.id);
      console.debug('[sync] cartão enviado', entry.card_id);
    } catch (error) {
      // Mantém esta entrada na fila e tenta as próximas; retry nas próximas syncs.
      console.warn('[sync] falha ao enviar', entry.card_id, error);
    }
  }
}

async function pullRemote(userId: string): Promise<SyncResult> {
  const lastPullKey = `last_pull_at:${userId}`;
  const lastPull = (await getMeta(lastPullKey)) ?? EPOCH;

  const { data, error } = await supabase
    .from('cards')
    .select('id, name, favorite, background_seed, front, back, created_at, updated_at')
    .eq('user_id', userId)
    .gt('updated_at', lastPull)
    .order('updated_at', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as RemoteCardRow[];
  const pulled: Card[] = [];
  let maxUpdated = lastPull;
  for (const row of rows) {
    if (row.updated_at > maxUpdated) {
      maxUpdated = row.updated_at;
    }
    if (await isCardDirty(row.id)) {
      continue;
    }
    const card: Card = {
      id: row.id,
      name: row.name,
      favorite: row.favorite,
      backgroundSeed: row.background_seed,
      front: row.front,
      back: parseBack(row.back),
      createdAt: row.created_at,
    };
    await replaceCardLocalClean(userId, card);
    pulled.push(card);
  }

  // Reconciliação de exclusões: remove do local o que não existe mais no servidor.
  const { data: idRows, error: idError } = await supabase
    .from('cards')
    .select('id')
    .eq('user_id', userId);
  if (idError) {
    throw new Error(idError.message);
  }
  const remoteIds = new Set((idRows ?? []).map((row) => row.id as string));
  const localCards = await loadCardsLocal(userId);
  const deletedIds: string[] = [];
  for (const local of localCards) {
    if (!remoteIds.has(local.id) && !(await isCardDirty(local.id))) {
      await deleteCardRowLocal(local.id);
      deletedIds.push(local.id);
    }
  }

  await setMeta(lastPullKey, maxUpdated);
  return { pulled, deletedIds, pullSucceeded: true };
}

export async function syncWithRemote(userId: string): Promise<SyncResult> {
  try {
    await serialize(() => flushOutbox(userId));
  } catch (error) {
    // Offline ou erro de rede: mantém a fila e tenta na próxima sincronização.
    console.warn('[sync] envio interrompido', error);
    return { pulled: [], deletedIds: [], pullSucceeded: false };
  }
  try {
    await serialize(() => flushMediaOutbox());
  } catch (error) {
    console.warn('[sync] limpeza de mídia interrompida', error);
  }
  try {
    const result = await serialize(() => pullRemote(userId));
    console.debug(
      `[sync] pull: ${result.pulled.length} atualizado(s), ${result.deletedIds.length} removido(s)`,
    );
    return result;
  } catch (error) {
    console.warn('[sync] pull falhou', error);
    return { pulled: [], deletedIds: [], pullSucceeded: false };
  }
}
