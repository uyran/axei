# Especificação técnica — Mini editor da frente e barra do verso do cartão

> **Contexto:** aplicativo Axei, React Native com Expo SDK 57 e TypeScript.
> **Backend:** Supabase (PostgreSQL + Storage).
> **Revisão:** 31/10/2026. Este documento descreve a implementação atual; as decisões que alteraram a versão de 11/10/2026 estão registradas no `CHANGELOG.md`.

---

## 1. Dependências

```json
{
  "react-native-pell-rich-editor": "^1.10.0",
  "react-native-webview": "13.16.1",
  "react-native-reanimated": "4.5.1",
  "expo-audio": "~57.0.5",
  "expo-image-picker": "~57.0.20",
  "expo-file-system": "~57.0.7"
}
```

`react-native-pell-rich-editor` fornece o `RichEditor` (WYSIWYG via WebView) e o enum `actions`.

`expo-crypto` **não** é utilizado: os identificadores são gerados por `generateId` em `src/utils/cards.ts`.

---

## 2. Arquitetura dos componentes

```
src/app/card/[id].tsx  (rota /card/[id])
├── CardBackground        (fundo Material You a partir de card.backgroundSeed)
├── ContentEditor         (RichEditor da frente)
├── FormattingToolbar     (barra da frente)
├── TableBlock            (menu de tabela da frente)
└── BackEditor            (nota, foto e áudio)
```

### Regra de exibição

- `FormattingToolbar` e `TableBlock` existem **apenas na face frontal**, no rodapé da frente e **dentro do cartão**.
- A face traseira não renderiza a barra de formatação; ela tem barra própria (Nota / Foto / Gravar).
- As duas faces são `Animated.View` absolutas e giram juntas no eixo Y.

---

## 3. Tela do cartão — `src/app/card/[id].tsx`

- **Barra superior** (fora do cartão): voltar, ícone do Axei e botão de opções (exclusão com confirmação).
- **Faixa da frente**: salvar (esquerda), nome centralizado, girar (direita).
- **Faixa do verso**: ícone, título "Verso" centralizado, girar (direita).
- Nome: `TextInput` centralizado; placeholder `Nome do cartão`; ao focar, o cursor vai para o início sem deslocar o texto.
- Salvar: recolhe o teclado e remove a seleção forçada.
- Girar: anima `rotation` de 0 → 180 (ou 180 → 0) em **450 ms** com `withTiming`, aplicando `perspective: 1000` e `rotateY`.
- O `zIndex` alterna em 90° para a face correta ficar na frente.
- O cartão de emergência usa nome em vermelho (`EMERGENCY_COLOR`).
- O menu de exclusão fica no canto superior direito da tela, fora do conteúdo do cartão.

---

## 4. Editor rico da frente — `src/components/card/content-editor.tsx`

```tsx
import type { RefObject } from 'react';
import { RichEditor } from 'react-native-pell-rich-editor';

import { normalizeCardContent } from '@/utils/card-html';

type ContentEditorProps = {
  content: string;
  editorRef: RefObject<RichEditor | null>;
  onChange: (html: string) => void;
};

export function ContentEditor({ content, editorRef, onChange }: ContentEditorProps) {
  return (
    <RichEditor
      ref={editorRef}
      autoCapitalize="sentences"
      autoCorrect
      defaultParagraphSeparator="p"
      editorStyle={{
        backgroundColor: 'transparent',
        caretColor: '#176B5B',
        color: '#282C32',
        placeholderColor: '#6E737A',
        contentCSSText: `
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
          line-height: 1.5;
          padding: 0;
          min-height: 260px;
        `,
        cssText: `
          .pell-content h1 { font-size: 24px; line-height: 1.3; }
          .pell-content h2 { font-size: 18px; line-height: 1.3; }
          h1 { margin: 0 0 10px; font-weight: 700; }
          h2 { margin: 10px 0 6px; font-weight: 600; }
          p  { margin: 0 0 8px; }
          .find-table { width: 100%; margin: 12px 0; border-collapse: collapse; table-layout: fixed; }
          .find-table td { min-width: 72px; height: 48px; padding: 8px; border: 1px solid #737980; vertical-align: top; overflow-wrap: anywhere; }
        `,
      }}
      initialContentHTML={normalizeCardContent(content)}
      initialHeight={260}
      onChange={onChange}
      pasteAsPlainText
      placeholder="Escreva aqui o conteúdo da frente do cartão"
      style={{ flex: 1, minHeight: 220, backgroundColor: 'transparent' }}
      useContainer={false}
    />
  );
}
```

- O conteúdo é armazenado como HTML em `Card.front`.
- `useContainer={false}` mantém a rolagem dentro do WebView.
- Não são usados `onCursorPosition` nem `onHeightChange`.
- O editor fica dentro de uma caixa com borda (`editorBox`) na face frontal.

### Normalização — `src/utils/card-html.ts`

`normalizeCardContent` mantém HTML existente e converte texto puro legado em `<h1>` + `<p>`. Conteúdo vazio retorna `''`.

```ts
const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export function normalizeCardContent(content: string) {
  if (content.trim() === '') return '';
  if (HTML_TAG_PATTERN.test(content)) return content;

  const lines = content.split(/\r?\n/);
  const firstLine = escapeHtml(lines.shift() ?? '') || '<br>';
  const remaining = lines
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');

  return `<h1>${firstLine}</h1>${remaining}`;
}
```

O mesmo arquivo exporta `TABLE_2X2_HTML`.

---

## 5. `FormattingToolbar`

Barra horizontal com rolagem, exibida no rodapé da frente.

| Botão | Rótulo visual | Ação |
|---|---|---|
| Estilo do texto | `Aa` | submenu “Título” (`heading1`) / “Subtítulo” (`heading2`) |
| Negrito | `B` | `setBold` |
| Lista | `☷` | submenu Marcadores / Numerada / Checklist |
| Cor | `A` sublinhado | paleta de 6 cores |
| Desfazer | `↶` | `undo` |

**Itálico (`I`) e refazer (`↷`) não existem na barra** — decisão confirmada em 31/10/2026.

- Submenus mutuamente exclusivos, abertos acima da barra:
  - estilo do texto: `bottom: 60`, `left: 4`;
  - lista: `bottom: 60`, `left: 118`;
  - cores: `bottom: 60`, `right: 4`.
- Paleta: `#202124`, `#176B5B`, `#A33A2B`, `#315CA8`, `#FF0000`, `#FFEB3B`.
- Dimensões: barra com 70 de altura; botões 42 × 44, raio 8, borda preta, fundo `#DBEAFE`.
- Ícones: estilo `#7C3AED`, negrito `#2563EB`, lista `#0D9488`, cor `#8B5CF6`, desfazer `#176B5B`.
- Estado ativo: o ícone fica branco e o fundo permanece `#DBEAFE` (contraste baixo; ajuste pendente).
- `keyboardShouldPersistTaps="always"` para não fechar o teclado ao tocar na barra.
- Componente: `src/components/card/formatting-toolbar.tsx`.

---

## 6. `TableBlock`

Botão separado da barra principal, ao lado dela, com menu de três opções:

| Opção | Ação |
|---|---|
| Nova 2×2 | insere `TABLE_2X2_HTML` via `insertHTML` |
| + Linha | adiciona linha à tabela mais próxima do cursor |
| + Coluna | adiciona coluna em todas as linhas da tabela |

- Botão 42 × 44, fundo `#DBEAFE`, borda preta; ativo com fundo `#EA580C` e ícone branco.
- Menu com `bottom: 60`, `right: 0`.
- Inserção e manipulação usam `commandDOM` e `closest('table.find-table')`; sem tabela selecionada, usa a última do documento.
- O CSS `.find-table` está em `ContentEditor`.
- Componente: `src/components/card/table-block.tsx`.

---

## 7. Verso — `src/components/card/back-editor.tsx`

### Modelo de dados — `src/types/card.ts`

```ts
export type BackItem =
  | { id: string; type: 'note'; text: string; createdAt: string }
  | { id: string; type: 'photo'; uri: string; createdAt: string }
  | { id: string; type: 'audio'; uri: string; durationMs: number; createdAt: string };
```

O verso é um bloco independente; **não** usa `RichEditor`.

### Lista de itens

- Nota: `TextInput` multilinha e botão de remoção.
- Foto: imagem com 180 de altura, rótulo "Foto" e remoção.
- Áudio: play/pause, duração `m:ss` e remoção.
- Verso vazio exibe texto orientando a usar a barra.

### Barra do verso

- **Nota**: adiciona um bloco de texto.
- **Foto**: abre alerta com "Tirar foto", "Escolher da galeria" e "Cancelar".
- **Gravar**: inicia a gravação; durante a gravação, um botão vermelho ocupa toda a largura da barra e mostra a duração em tempo real.
- Botões com altura mínima de 44, fundo `#DBEAFE` e borda preta; a cor fica no ícone/rótulo: nota `#7C3AED`, foto `#2563EB`, gravar `#DC2626`.

### Arquivos e permissões

- Áudio gravado em `documentDirectory` (`useAudioRecorder` com `directory: 'document'`, preset `HIGH_QUALITY`).
- Fotos copiadas para `documentDirectory/card-files/`.
- Remover um item apaga a cópia **local** e enfileira a remoção do objeto no Storage (`media_outbox`, processada na sincronização). Excluir o cartão remove a pasta `userId/cardId/` inteira. Implementado em 31/10/2026.
- Permissões negadas (câmera, galeria, microfone) geram alerta em português.
- Permissões declaradas em `app.json`: `expo-audio` (microfone) e `expo-image-picker` (fotos e câmera). Em 31/10/2026 o `microphonePermission` do image-picker deixou de ser `false` para não remover `RECORD_AUDIO` do Android.

### Sincronização de mídia

- Fotos e áudios são enviados ao bucket privado `card-media`.
- Após o upload, a URI local é substituída pelo caminho no Storage.
- Uma cópia local é mantida em `media-cache/` e baixada sob demanda por `useMediaUri`.

---

## 8. Persistência do cartão

```ts
export type Card = {
  id: string;
  name: string;
  favorite: boolean;
  backgroundSeed: number;
  front: string;
  back: BackItem[];
  createdAt: string;
};
```

- `BackEditor` recebe `back` e `onChange`; a tela chama `setCardBack(card.id, back)`.
- `useCards` mantém o estado, grava no SQLite com debounce de 800 ms e enfileira no `outbox`.
- A sincronização envia para `public.cards` (JSONB em `back`) e reconcilia exclusões por `user_id`.

---

## 9. Paleta atual

| Token | Hex | Uso |
|---|---|---|
| Primário | `#208AEF` | ícones de navegação, FAB |
| Texto | `#111827` | texto principal |
| Texto secundário | `#6B7280` | placeholders e legendas |
| Borda | `#D1D5DB` / `#9CA3AF` | bordas de caixas e divisores |
| Fundo | `#F6F7F9` | fundo das telas |
| Emergência/favorito | `#DC2626` | nome do cartão de emergência e estrela |
| Botões de barra | `#DBEAFE` | fundo dos botões (frente e verso) |
| Estilo | `#7C3AED` | Aa e nota |
| Formatação | `#2563EB` | B e foto |
| Lista | `#0D9488` | ☷ |
| Cor | `#8B5CF6` | A |
| Desfazer | `#176B5B` | ↶ |
| Tabela | `#EA580C` | ▦ |
| Gravação | `#DC2626` | botão de gravar e barra de gravação |
| Busca | `#c0def3` | fundo da barra de pesquisa |
| Menus | `#FFFFFF` / `#C9CDD3` / `#202329` | fundo, borda e sombra |

---

## 10. Padrão de menus flutuantes

```ts
{
  position: 'absolute',
  overflow: 'hidden',
  borderRadius: 10,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: '#C9CDD3',
  backgroundColor: '#FFFFFF',
  shadowColor: '#202329',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.16,
  shadowRadius: 7,
  elevation: 7,
}
```

- Posicionados por `bottom` + `left`/`right` em relação ao container.
- Itens com `minHeight: 42` e `paddingHorizontal: 12–14`.
- Texto de menu: `fontSize: 14`, `fontWeight: '600'`, `color: '#25282E'`.
- Abrir um menu fecha os outros dentro do mesmo componente.
- O tamanho padrão do texto é 22 px; Título (`h1`) usa 24 px e Subtítulo (`h2`) usa 22 px.

---

## 11. Fluxo resumido

1. A rota `card/[id]` carrega o cartão do cache/provider.
2. A face frontal exibe nome, editor rico e a barra de formatação **dentro do cartão**.
3. A rotação de 450 ms alterna frente e verso.
4. No verso, a barra oferece Nota, Foto (câmera ou galeria) e Gravar.
5. Toda edição atualiza o estado, persiste no SQLite e entra na fila de sincronização.

---

## 12. Pendências conhecidas

- Contraste do estado ativo da barra.
- Efeitos sonoros em `assets/sounds/` ainda não rastreados no Git.
- `media-cache/` e `card-files/` não são limpos no logout (proposta registrada no `CHANGELOG.md`).
- Cartão de emergência legado (`id = 'emergency'`) preso na fila de um segundo usuário precisa de migração manual.
