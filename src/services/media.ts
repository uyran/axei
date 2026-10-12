import { Directory, File, Paths } from 'expo-file-system';

import { supabase } from './supabase';

const MEDIA_BUCKET = 'card-media';
const CACHE_DIRECTORY_NAME = 'media-cache';

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

export async function resolveMediaUri(storagePath: string): Promise<string> {
  const fileName = storagePath.split('/').pop();
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

export async function cacheLocalCopy(sourceUri: string, fileName: string): Promise<void> {
  try {
    const cached = new File(cacheDirectory(), fileName);
    if (!cached.exists) {
      await new File(sourceUri).copy(cached);
    }
  } catch {
    // Cache é otimização; download posterior resolve se a cópia falhar.
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
    .upload(storagePath, body, { contentType, upsert: true });
  if (error) {
    throw new Error(error.message);
  }
}
