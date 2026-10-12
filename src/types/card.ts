export type BackItem =
  | { id: string; type: 'note'; text: string; createdAt: string }
  | { id: string; type: 'photo'; uri: string; createdAt: string }
  | {
      id: string;
      type: 'audio';
      uri: string;
      durationMs: number;
      createdAt: string;
    };

export type Card = {
  id: string;
  name: string;
  favorite: boolean;
  backgroundSeed: number;
  front: string;
  back: BackItem[];
  createdAt: string;
};
