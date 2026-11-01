import type { Card } from '@/types/card';

export const CARD_PLACEHOLDER_NAME = 'Nome do cartão';
const CARD_INTERNAL_NAME = 'Sem título';

const LEGACY_EMERGENCY_CARD_ID = 'emergency';
export const EMERGENCY_CARD_ID_PREFIX = 'emergency:';
export const EMERGENCY_CARD_NAME = 'Emergência';
export const EMERGENCY_COLOR = '#DC2626';

export const EMERGENCY_FRONT_HTML = [
  '<p>190 – Polícia Militar</p>',
  '<p>192 – SAMU</p>',
  '<p>193 – Corpo de Bombeiros</p>',
  '<p>199 – Defesa Civil</p>',
  '<p>191 – Polícia Rodoviária Federal</p>',
  '<p>180 – Central de Atendimento à Mulher</p>',
  '<p>100 – Direitos Humanos - Violações contra Crianças e Adolescentes</p>',
].join('');

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

export function emergencyCardId(userId: string): string {
  return `${EMERGENCY_CARD_ID_PREFIX}${userId}`;
}

export function isEmergencyCard(card: Card): boolean {
  return (
    card.id === LEGACY_EMERGENCY_CARD_ID || card.id.startsWith(EMERGENCY_CARD_ID_PREFIX)
  );
}

export function createEmergencyCard(userId: string): Card {
  return {
    id: emergencyCardId(userId),
    name: EMERGENCY_CARD_NAME,
    favorite: false,
    backgroundSeed: Math.floor(Math.random() * 1_000_000),
    front: EMERGENCY_FRONT_HTML,
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
