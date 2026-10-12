import type { Card } from '@/types/card';

export const CARD_PLACEHOLDER_NAME = 'Nome do cartão';
const CARD_INTERNAL_NAME = 'Sem título';

let idCounter = 0;

export function generateId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

export function createCard(): Card {
  return {
    id: generateId(),
    name: '',
    favorite: false,
    backgroundSeed: Math.floor(Math.random() * 1_000_000),
    front: '',
    back: [],
    createdAt: new Date().toISOString(),
  };
}

export function displayCardName(card: Card): string {
  const name = card.name.trim();
  return name === '' ? CARD_INTERNAL_NAME : name;
}

export function sortCardsByName(cards: Card[]): Card[] {
  return [...cards].sort((a, b) =>
    displayCardName(a).localeCompare(displayCardName(b), 'pt-BR', { sensitivity: 'base' }),
  );
}

export function hasSignificantContent(card: Card): boolean {
  if (card.name.trim() !== '') {
    return true;
  }
  if (card.back.length > 0) {
    return true;
  }
  return htmlToPlainText(card.front).trim() !== '';
}

export function matchesQuery(card: Card, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized === '') {
    return true;
  }
  return (
    displayCardName(card).toLowerCase().includes(normalized) ||
    htmlToPlainText(card.front).toLowerCase().includes(normalized)
  );
}
