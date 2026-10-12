import * as SQLite from 'expo-sqlite';

import type { BackItem, Card } from '@/types/card';

const DATABASE_NAME = 'axei-cache.db';

type CardRow = {
  id: string;
  user_id: string;
  name: string;
  favorite: number;
  background_seed: number;
  front: string;
  back: string;
  created_at: string;
  dirty: number;
};

export type OutboxEntry = { card_id: string; op: 'upsert' | 'delete' };

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      favorite INTEGER NOT NULL DEFAULT 0,
      background_seed INTEGER NOT NULL DEFAULT 0,
      front TEXT NOT NULL DEFAULT '',
      back TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS cards_user_idx ON cards (user_id);
    CREATE TABLE IF NOT EXISTS outbox (
      card_id TEXT PRIMARY KEY NOT NULL,
      op TEXT NOT NULL,
      queued_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase();
  }
  return databasePromise;
}

let serialChain: Promise<unknown> = Promise.resolve();

export function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = serialChain.then(task, task);
  serialChain = run.catch(() => undefined);
  return run;
}

function parseBack(value: string): BackItem[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as BackItem[]) : [];
  } catch {
    return [];
  }
}

function rowToCard(row: CardRow): Card {
  return {
    id: row.id,
    name: row.name,
    favorite: row.favorite === 1,
    backgroundSeed: row.background_seed,
    front: row.front,
    back: parseBack(row.back),
    createdAt: row.created_at,
  };
}

export async function loadCardsLocal(userId: string): Promise<Card[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CardRow>(
    'SELECT * FROM cards WHERE user_id = ? ORDER BY created_at',
    userId,
  );
  return rows.map(rowToCard);
}

export async function loadCardLocal(cardId: string): Promise<Card | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE id = ?', cardId);
  return row ? rowToCard(row) : null;
}

export async function saveCardLocal(userId: string, card: Card): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO cards (id, user_id, name, favorite, background_seed, front, back, created_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       name = excluded.name,
       favorite = excluded.favorite,
       background_seed = excluded.background_seed,
       front = excluded.front,
       back = excluded.back,
       dirty = 1`,
    [
      card.id,
      userId,
      card.name,
      card.favorite ? 1 : 0,
      card.backgroundSeed,
      card.front,
      JSON.stringify(card.back),
      card.createdAt,
    ],
  );
  await db.runAsync(
    `INSERT INTO outbox (card_id, op, queued_at) VALUES (?, 'upsert', ?)
     ON CONFLICT(card_id) DO UPDATE SET op = 'upsert', queued_at = excluded.queued_at`,
    [card.id, new Date().toISOString()],
  );
}

export async function deleteCardLocal(cardId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cards WHERE id = ?', cardId);
  await db.runAsync(
    `INSERT INTO outbox (card_id, op, queued_at) VALUES (?, 'delete', ?)
     ON CONFLICT(card_id) DO UPDATE SET op = 'delete', queued_at = excluded.queued_at`,
    [cardId, new Date().toISOString()],
  );
}

export async function updateCardBackLocal(cardId: string, back: BackItem[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE cards SET back = ? WHERE id = ?', [JSON.stringify(back), cardId]);
}

export async function loadOutbox(): Promise<OutboxEntry[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxEntry>('SELECT card_id, op FROM outbox ORDER BY queued_at');
}

export async function removeOutboxEntry(cardId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox WHERE card_id = ?', cardId);
}

export async function outboxCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM outbox');
  return row?.count ?? 0;
}

export async function isCardDirty(cardId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ dirty: number }>(
    'SELECT dirty FROM cards WHERE id = ?',
    cardId,
  );
  return (row?.dirty ?? 0) === 1;
}

export async function markCardClean(cardId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE cards SET dirty = 0 WHERE id = ?', cardId);
}

export async function replaceCardLocalClean(userId: string, card: Card): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO cards (id, user_id, name, favorite, background_seed, front, back, created_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       name = excluded.name,
       favorite = excluded.favorite,
       background_seed = excluded.background_seed,
       front = excluded.front,
       back = excluded.back,
       dirty = 0`,
    [
      card.id,
      userId,
      card.name,
      card.favorite ? 1 : 0,
      card.backgroundSeed,
      card.front,
      JSON.stringify(card.back),
      card.createdAt,
    ],
  );
}

export async function deleteCardRowLocal(cardId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cards WHERE id = ?', cardId);
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}
