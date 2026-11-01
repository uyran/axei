import { Directory, File, Paths } from 'expo-file-system';

import { supabase } from './supabase';

const MEDIA_BUCKET = 'card-media';
const CACHE_DIRECTORY_NAME = 'media-cache';
const LIST_PAGE_SIZE = 100;

export function isLocalMediaUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

function cacheDirectory(): Directory {
  const directory = new Directory(Paths.document, CACHE_DIRECTORY_NAME);
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  return directory;
}

function cachedFileName(storagePath: string): string | null {
  const fileName = storagePath.split('/').pop();
  return fileName && fileName !== '' ? fileName : null;
}

export async function resolveMediaUri(storagePath: string): Promise<string> {
  const fileName = cachedFileName(storagePath);
  if (!fileName) {
    throw new Error('Caminho de mídia inválido.');
  }
  const cached = new File(cacheDirectory(), fileName);
  if (cached.exists) {
    return cached.uri;
  }
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? 'Falha ao baixar a mídia.');
  }
  await cached.write(new Uint8Array(await data.arrayBuffer()));
  return cached.uri;
}

export async function cacheLocalCopy(sourceUri: string, fileName: string): Promise<boolean> {
  try {
    const cached = new File(cacheDirectory(), fileName);
    if (!cached.exists) {
      await new File(sourceUri).copy(cached);
    }
    return true;
  } catch {
    // Cache é otimização; download posterior resolve se a cópia falhar.
    return false;
  }
}

export async function deleteCachedMedia(storagePath: string): Promise<void> {
  const fileName = cachedFileName(storagePath);
  if (!fileName) {
    return;
  }
  try {
    const cached = new File(new Directory(Paths.document, CACHE_DIRECTORY_NAME), fileName);
    if (cached.exists) {
      cached.delete();
    }
  } catch {
    // O arquivo pode já ter sido removido pelo sistema.
  }
}

export async function uploadCardMedia(
  localUri: string,
  storagePath: string,
  contentType: string,
): Promise<void> {
  const file = new File(localUri);
  const bytes = await file.bytes();
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, body, { contentType, upsert: false });
  // O caminho é único por item: se o objeto já existe, o upload anterior concluiu
  // e não há política de UPDATE no bucket. Tratar como sucesso destrava o retry.
  if (error && !isAlreadyUploadedError(error)) {
    throw new Error(error.message);
  }
}

function isAlreadyUploadedError(error: { message?: string; statusCode?: string | number }): boolean {
  if (String(error.statusCode ?? '') === '409') {
    return true;
  }
  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('resource already exists')
  );
}

export async function removeStorageObjects(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) {
    return;
  }
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(storagePaths);
  if (error) {
    throw new Error(error.message);
  }
}

export async function removeStorageFolder(folderPath: string): Promise<void> {
  const prefix = folderPath.replace(/\/+$/, '');
  if (prefix === '') {
    return;
  }
  const storagePaths: string[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(prefix, { limit: LIST_PAGE_SIZE, offset });
    if (error) {
      throw new Error(error.message);
    }
    const entries = data ?? [];
    for (const entry of entries) {
      // Pastas não têm id; a estrutura é userId/cardId/itemId.ext.
      if (entry.id) {
        storagePaths.push(`${prefix}/${entry.name}`);
      }
    }
    if (entries.length < LIST_PAGE_SIZE) {
      break;
    }
  }
  await removeStorageObjects(storagePaths);
}
