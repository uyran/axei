# Especificação Técnica – Mini Editor de Texto e Menus do Verso do Cartão

> **Contexto**: Projeto React Native (Expo SDK 57) com TypeScript.  
> **Objetivo**: Reproduzir exatamente o mini editor de texto rico e o sistema de menus presentes no verso (back) do cartão.

---

## 1. Dependências Necessárias

```json
{
  "react-native-pell-rich-editor": "^1.10.0",
  "react-native-webview": "13.16.1",
  "react-native-reanimated": "4.5.1",
  "expo-crypto": "~57.0.3"
}
```

A lib `react-native-pell-rich-editor` fornece o componente `RichEditor` (editor WYSIWYG via WebView) e o enum `actions` para enviar comandos de formatação.

---

## 2. Arquitetura de Componentes

```
CardEditor (tela principal)
├── CardFlip (animação de virar cartão com Reanimated)
│   ├── CardFront (frente: nome + editor RichEditor + CardContentEditor)
│   └── CardBack (verso: controles + lista de blocos)
│       ├── CardPhotoBlock
│       ├── CardAudioBlock
│       └── CardTextBlock (bloco de anotação simples, TextInput)
├── FormattingToolbar (barra de ferramentas do editor rico – FRENTE)
└── TableBlock (botão de inserir/editar tabelas – FRENTE)
```

### Regra importante
A `FormattingToolbar` e o `TableBlock` são exibidos **apenas na FRENTE** do cartão (quando `isBack === false`). O verso do cartão (`CardBack`) usa um sistema diferente: blocos independentes (foto, áudio, texto simples).

---

## 3. O CardEditor – Componente Pai

O `CardEditor` é o container de tudo. Ele:
- Cria a `ref` do `RichEditor` (`editorRef`) e a passa para baixo.
- Gerencia o estado `isBack` para controlar se mostra a toolbar ou não.
- Quando `isBack === false` (frente visível), renderiza `FormattingToolbar` + `TableBlock` no rodapé.

```tsx
// Trecho simplificado de CardEditor.tsx
const editorRef = useRef<RichEditor>(null);
const [isBack, setIsBack] = useState(false);

return (
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    {/* ... navegação ... */}
    
    <ScrollView keyboardShouldPersistTaps="handled">
      <CardFlip
        editorRef={editorRef}
        onFaceChange={setIsBack}
        {/* ... outras props ... */}
      />
    </ScrollView>

    {/* Toolbar só aparece na FRENTE do cartão */}
    {!isBack && (
      <View style={styles.tools}>
        <FormattingToolbar editorRef={editorRef} />
        <TableBlock editorRef={editorRef} />
      </View>
    )}
  </KeyboardAvoidingView>
);

// styles.tools:
// { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: Platform.OS === 'android' ? 24 : 12 }
```

---

## 4. O Editor Rico (RichEditor) – `CardContentEditor`

Na **frente** do cartão, o conteúdo é editado por um `RichEditor` da lib `react-native-pell-rich-editor`. Ele é wrapper no componente `CardContentEditor`:

```tsx
import { RichEditor } from 'react-native-pell-rich-editor';

export function CardContentEditor({ content, editorRef, onChange, onCursorPosition, onHeightChange }) {
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
          font-size: 22px;
          line-height: 1.5;
          padding: 0;
          min-height: 260px;
        `,
        cssText: `
          .pell-content, .pell-content p, .pell-content div,
          .pell-content li, .pell-content td, .pell-content blockquote,
          .pell-content span { font-size: 22px !important; }
          .pell-content h1, .pell-content h1 * { font-size: 24px !important; line-height: 1.3; }
          .pell-content h2, .pell-content h2 * { font-size: 22px !important; line-height: 1.3; }
          h1 { margin: 0 0 10px; font-weight: 700; }
          h2 { margin: 10px 0 6px; font-weight: 600; }
          p  { margin: 0 0 8px; }
          .find-table { width: 100%; margin: 12px 0; border-collapse: collapse; table-layout: fixed; }
          .find-table td { min-width: 72px; height: 48px; padding: 8px; border: 1px solid #737980; vertical-align: top; overflow-wrap: anywhere; }
        `,
      }}
      initialContentHTML={normalizeCardContent(content)}
      initialHeight={300}
      onChange={onChange}
      onCursorPosition={onCursorPosition}
      onHeightChange={onHeightChange}
      pasteAsPlainText
      placeholder="Conteúdo livre..."
      style={{ flex: 1, minHeight: 300, backgroundColor: 'transparent' }}
    />
  );
}
```

### Utilitário `normalizeCardContent`

Converte texto puro legado em HTML (transforma a primeira linha em `<h1>` e as demais em `<p>`). Se já for HTML, retorna sem alteração.

```ts
const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizeCardContent(content: string) {
  if (HTML_TAG_PATTERN.test(content)) return content;

  const lines = content.split(/\r?\n/);
  const firstLine = escapeHtml(lines.shift() ?? '') || '<br>';
  const remaining = lines
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');

  return `<h1>${firstLine}</h1>${remaining}`;
}
```

---

## 5. FormattingToolbar – Barra de Ferramentas de Formatação

Uma barra horizontal com scroll que aparece no rodapé e controla o `RichEditor` via `editorRef`.

### Funcionalidades

| Botão | Label visual | Ação |
|-------|-------------|------|
| **Aa** (estilo texto) | Abre sub-menu com "Título" (h1) e "Subtítulo" (h2) | `actions.heading1` / `actions.heading2` |
| **B** (negrito) | Texto em negrito | `actions.setBold` |
| *I* (itálico) | Texto em itálico | `actions.setItalic` |
| **☷** (lista) | Abre sub-menu com 3 tipos de lista | `actions.insertBulletsList` / `actions.insertOrderedList` / `actions.checkboxList` |
| **A** (cor) | Abre paleta de 6 cores | `editorRef.current.setForeColor(color)` |
| **↶** (desfazer) | Undo | `actions.undo` |
| **↷** (refazer) | Redo | `actions.redo` |

### Mecânica dos Sub-menus

Há 3 sub-menus que são **mutuamente exclusivos** (abrir um fecha os outros):
1. **Menu de Estilo de Texto** (`isTextStyleMenuOpen`) – posição: `bottom: 60, left: 4`
2. **Menu de Lista** (`isListMenuOpen`) – posição: `bottom: 60, left: 118`
3. **Menu de Cores** (`isColorMenuOpen`) – posição: `bottom: 60, right: 4`

Cada toggle fecha os outros dois antes de abrir/fechar o seu:
```tsx
const toggleTextStyleMenu = () => {
  setIsColorMenuOpen(false);
  setIsListMenuOpen(false);
  setIsTextStyleMenuOpen((open) => !open);
};
```

### Paleta de Cores
```ts
const COLORS = ['#202124', '#176B5B', '#A33A2B', '#315CA8', '#FF0000', '#FFEB3B'];
```
Renderizada como uma row horizontal de swatches circulares (22×22, borderRadius: 11).

### Código Completo da FormattingToolbar

```tsx
import React, { type RefObject, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { actions, RichEditor } from 'react-native-pell-rich-editor';

interface FormattingToolbarProps {
  editorRef: RefObject<RichEditor | null>;
}

const COLORS = ['#202124', '#176B5B', '#A33A2B', '#315CA8', '#FF0000', '#FFEB3B'];

export function FormattingToolbar({ editorRef }: FormattingToolbarProps) {
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [isTextStyleMenuOpen, setIsTextStyleMenuOpen] = useState(false);

  const action = (type: actions) => {
    editorRef.current?.sendAction(type, 'result');
  };

  const chooseTextStyle = (type: actions) => {
    action(type);
    setIsTextStyleMenuOpen(false);
  };

  const chooseList = (type: actions) => {
    action(type);
    setIsListMenuOpen(false);
  };

  const chooseColor = (color: string) => {
    editorRef.current?.setForeColor(color);
    setIsColorMenuOpen(false);
  };

  const toggleTextStyleMenu = () => {
    setIsColorMenuOpen(false);
    setIsListMenuOpen(false);
    setIsTextStyleMenuOpen((open) => !open);
  };

  const toggleColorMenu = () => {
    setIsListMenuOpen(false);
    setIsTextStyleMenuOpen(false);
    setIsColorMenuOpen((open) => !open);
  };

  const toggleListMenu = () => {
    setIsColorMenuOpen(false);
    setIsTextStyleMenuOpen(false);
    setIsListMenuOpen((open) => !open);
  };

  return (
    <View style={styles.container}>
      {/* Sub-menu de cores – posicionado acima da toolbar */}
      {isColorMenuOpen && (
        <View accessibilityLabel="Cores do texto" style={styles.colorMenu}>
          {COLORS.map((color) => (
            <Pressable
              accessibilityLabel={`Selecionar cor ${color}`}
              accessibilityRole="button"
              key={color}
              onPress={() => chooseColor(color)}
              style={styles.menuSwatchButton}
            >
              <View style={[styles.swatch, { backgroundColor: color }]} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Sub-menu de estilo de texto */}
      {isTextStyleMenuOpen && (
        <View accessibilityLabel="Estilo do texto" style={styles.textStyleMenu}>
          <Pressable onPress={() => chooseTextStyle(actions.heading1)} style={styles.textStyleItem}>
            <Text style={styles.menuTitle}>Título</Text>
          </Pressable>
          <Pressable onPress={() => chooseTextStyle(actions.heading2)} style={styles.textStyleItem}>
            <Text style={styles.menuSubtitle}>Subtítulo</Text>
          </Pressable>
        </View>
      )}

      {/* Sub-menu de lista */}
      {isListMenuOpen && (
        <View accessibilityLabel="Tipos de lista" style={styles.listMenu}>
          <Pressable onPress={() => chooseList(actions.insertBulletsList)} style={styles.listMenuItem}>
            <Text style={styles.listMenuSymbol}>•</Text>
            <Text style={styles.listMenuText}>Marcadores</Text>
          </Pressable>
          <Pressable onPress={() => chooseList(actions.insertOrderedList)} style={styles.listMenuItem}>
            <Text style={styles.listMenuSymbol}>1.</Text>
            <Text style={styles.listMenuText}>Numerada</Text>
          </Pressable>
          <Pressable onPress={() => chooseList(actions.checkboxList)} style={styles.listMenuItem}>
            <Text style={styles.listMenuSymbol}>☑</Text>
            <Text style={styles.listMenuText}>Checklist</Text>
          </Pressable>
        </View>
      )}

      {/* Toolbar principal – ScrollView horizontal */}
      <ScrollView
        contentContainerStyle={styles.content}
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        style={styles.toolbar}
      >
        {/* Botão Estilo (Aa) */}
        <Pressable
          accessibilityLabel={isTextStyleMenuOpen ? 'Fechar estilos de texto' : 'Escolher estilo de texto'}
          onPress={toggleTextStyleMenu}
          style={[styles.button, isTextStyleMenuOpen && styles.activeButton]}
        >
          <Text style={styles.normalIcon}>Aa</Text>
        </Pressable>

        {/* Botão Negrito (B) */}
        <Pressable accessibilityLabel="Negrito" onPress={() => action(actions.setBold)} style={styles.button}>
          <Text style={styles.boldIcon}>B</Text>
        </Pressable>

        {/* Botão Itálico (I) */}
        <Pressable accessibilityLabel="Itálico" onPress={() => action(actions.setItalic)} style={styles.button}>
          <Text style={styles.italicIcon}>I</Text>
        </Pressable>

        {/* Botão Lista (☷) */}
        <Pressable
          accessibilityLabel={isListMenuOpen ? 'Fechar tipos de lista' : 'Escolher tipo de lista'}
          onPress={toggleListMenu}
          style={[styles.button, isListMenuOpen && styles.activeButton]}
        >
          <Text style={styles.listIcon}>☷</Text>
        </Pressable>

        <View style={styles.separator} />

        {/* Botão Cor (A com sublinhado colorido) */}
        <Pressable
          accessibilityLabel={isColorMenuOpen ? 'Fechar cores do texto' : 'Escolher cor do texto'}
          onPress={toggleColorMenu}
          style={[styles.button, isColorMenuOpen && styles.activeButton]}
        >
          <View style={styles.colorIcon}>
            <Text style={styles.colorLetter}>A</Text>
            <View style={styles.colorUnderline} />
          </View>
        </Pressable>

        <View style={styles.separator} />

        {/* Botões Undo/Redo */}
        <Pressable accessibilityLabel="Desfazer" onPress={() => action(actions.undo)} style={styles.button}>
          <Text style={styles.historyIcon}>↶</Text>
        </Pressable>
        <Pressable accessibilityLabel="Refazer" onPress={() => action(actions.redo)} style={styles.button}>
          <Text style={styles.historyIcon}>↷</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative', zIndex: 2 },
  toolbar: {
    flex: 1,
    height: 54,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C9CDD3',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  content: { alignItems: 'center', paddingHorizontal: 6 },
  button: { width: 42, height: 48, alignItems: 'center', justifyContent: 'center' },
  normalIcon: { color: '#25282E', fontSize: 16 },
  boldIcon: { color: '#25282E', fontSize: 19, fontWeight: '800' },
  italicIcon: { color: '#25282E', fontSize: 19, fontStyle: 'italic', fontWeight: '600' },
  listIcon: { color: '#25282E', fontSize: 17, fontWeight: '600' },
  historyIcon: { color: '#176B5B', fontSize: 23 },
  activeButton: { backgroundColor: '#F1ECFF', borderRadius: 8 },
  colorIcon: { alignItems: 'center', justifyContent: 'center' },
  colorLetter: { color: '#25282E', fontSize: 18, fontWeight: '600', lineHeight: 20 },
  colorUnderline: { width: 18, height: 3, marginTop: 2, borderRadius: 2, backgroundColor: '#8B5CF6' },
  separator: { width: 1, height: 26, marginHorizontal: 4, backgroundColor: '#D8DBE0' },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#C3C6CB' },
  colorMenu: {
    position: 'absolute', bottom: 60, right: 4, zIndex: 3,
    flexDirection: 'row', padding: 5,
    borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C9CDD3',
    backgroundColor: '#FFFFFF',
    shadowColor: '#202329', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 7, elevation: 7,
  },
  menuSwatchButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  textStyleMenu: {
    position: 'absolute', bottom: 60, left: 4, zIndex: 3,
    minWidth: 132, overflow: 'hidden',
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C9CDD3',
    backgroundColor: '#FFFFFF',
    shadowColor: '#202329', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 7, elevation: 7,
  },
  textStyleItem: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center' },
  menuTitle: { color: '#25282E', fontSize: 24, fontWeight: '700' },
  menuSubtitle: { color: '#25282E', fontSize: 22, fontWeight: '600' },
  listMenu: {
    position: 'absolute', bottom: 60, left: 118, zIndex: 3,
    minWidth: 146, overflow: 'hidden',
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C9CDD3',
    backgroundColor: '#FFFFFF',
    shadowColor: '#202329', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 7, elevation: 7,
  },
  listMenuItem: { minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  listMenuSymbol: { width: 22, color: '#176B5B', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  listMenuText: { color: '#25282E', fontSize: 14, fontWeight: '600' },
});
```

---

## 6. TableBlock – Inserção e Manipulação de Tabelas

Botão quadrado (54×54) ao lado da `FormattingToolbar`. Abre um sub-menu com 3 opções:

| Opção | Ação |
|-------|------|
| **Nova 2×2** | Insere uma tabela HTML 2×2 com classe `find-table` |
| **+ Linha** | Adiciona uma linha na tabela mais próxima do cursor |
| **+ Coluna** | Adiciona uma coluna em todas as linhas da tabela |

### HTML da Tabela 2×2

```html
<table class="find-table">
  <tbody>
    <tr><td><br></td><td><br></td></tr>
    <tr><td><br></td><td><br></td></tr>
  </tbody>
</table>
<p><br></p>
```

### Manipulação via `commandDOM`

Para adicionar linhas/colunas, o componente usa `editorRef.current.commandDOM(jsString)` que executa JavaScript dentro do WebView do editor. O código:
1. Localiza a tabela via `element.closest('table.find-table')` a partir da seleção atual.
2. Se não encontra pelo cursor, usa a última tabela no documento.
3. Insere row/column e dispara evento `input` para sincronizar.

```tsx
import React, { type RefObject, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RichEditor } from 'react-native-pell-rich-editor';

export const TABLE_2X2_HTML = `
  <table class="find-table">
    <tbody>
      <tr><td><br></td><td><br></td></tr>
      <tr><td><br></td><td><br></td></tr>
    </tbody>
  </table>
  <p><br></p>
`;

export function TableBlock({ editorRef }: { editorRef: RefObject<RichEditor | null> }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const insertTable = () => {
    editorRef.current?.insertHTML(TABLE_2X2_HTML);
    setIsMenuOpen(false);
  };

  const changeCurrentTable = (operation: 'row' | 'column') => {
    const mutation = operation === 'row'
      ? `var row=document.createElement('tr'); var count=table.rows[0] ? table.rows[0].cells.length : 2; for(var i=0;i<count;i++){var cell=document.createElement('td');cell.innerHTML='<br>';row.appendChild(cell);} table.tBodies[0].appendChild(row);`
      : `Array.from(table.rows).forEach(function(row){var cell=document.createElement('td');cell.innerHTML='<br>';row.appendChild(cell);});`;

    editorRef.current?.commandDOM(`
      var selection=document.getSelection();
      var node=selection && selection.anchorNode;
      var element=node && (node.nodeType===1 ? node : node.parentElement);
      var table=element && element.closest ? element.closest('table.find-table') : null;
      if(!table){var tables=document.querySelectorAll('table.find-table');table=tables[tables.length-1];}
      if(table){${mutation} var root=$('[contenteditable="true"]');if(root){root.dispatchEvent(new Event('input',{bubbles:true}));}}
    `);
    setIsMenuOpen(false);
  };

  return (
    <View style={styles.container}>
      {isMenuOpen && (
        <View style={styles.menu}>
          <Pressable onPress={insertTable} style={styles.menuItem}>
            <Text style={styles.menuText}>Nova 2×2</Text>
          </Pressable>
          <Pressable onPress={() => changeCurrentTable('row')} style={styles.menuItem}>
            <Text style={styles.menuText}>+ Linha</Text>
          </Pressable>
          <Pressable onPress={() => changeCurrentTable('column')} style={styles.menuItem}>
            <Text style={styles.menuText}>+ Coluna</Text>
          </Pressable>
        </View>
      )}
      <Pressable
        accessibilityLabel={isMenuOpen ? 'Fechar opções de tabela' : 'Opções de tabela'}
        onPress={() => setIsMenuOpen((open) => !open)}
        style={({ pressed }) => [styles.button, (pressed || isMenuOpen) && styles.pressed]}
      >
        <Text style={styles.icon}>▦</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', zIndex: 3 },
  button: {
    width: 54, height: 54, marginTop: 12, marginLeft: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#C9CDD3', borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  pressed: { backgroundColor: '#E8F2EF' },
  icon: { color: '#176B5B', fontSize: 27, lineHeight: 30 },
  menu: {
    position: 'absolute', right: 0, bottom: 60,
    minWidth: 112, overflow: 'hidden',
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C9CDD3',
    backgroundColor: '#FFFFFF',
    shadowColor: '#202329', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 7, elevation: 7,
  },
  menuItem: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center' },
  menuText: { color: '#25282E', fontSize: 14, fontWeight: '600' },
});
```

---

## 7. O Verso do Cartão – `CardBack`

O verso NÃO usa o RichEditor. Ele usa **blocos independentes** (foto, áudio, texto). Cada bloco é um item do tipo `CardBackItem`:

```ts
export type CardBackItemType = 'photo' | 'audio' | 'text';

export interface CardBackItem {
  id: string;
  cardId: string;
  type: CardBackItemType;
  content: string;       // URI da foto/áudio, ou texto da anotação
  caption?: string | null;
  createdAt: number;
}
```

### Barra de controles do verso

3 botões à esquerda + 1 botão de flip à direita:

| Botão | Emoji | Ação |
|-------|-------|------|
| 📷 | Foto | Abre sub-menu com "Câmera" e "Galeria" |
| 🎤 | Áudio | Adiciona bloco de áudio |
| 📝 | Texto | Adiciona bloco de anotação |
| ↻ | Flip | Volta para a frente |

O sub-menu de foto é um popover com 3 opções (Câmera, Galeria, Cancelar), posicionado abaixo do botão.

### Bloco de Texto Simples (`CardTextBlock`)

O bloco de anotação de texto do **verso** é um `TextInput` multiline simples (NÃO usa RichEditor), com visual de "papel pautado":

```tsx
export function CardTextBlock({ item, onContentChange, onDelete }) {
  const [inputHeight, setInputHeight] = useState(48);
  const ruledLines = useMemo(
    () => Array.from({ length: Math.max(2, Math.ceil(inputHeight / 22)) }),
    [inputHeight]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftRow}>
          <Text style={styles.icon}>📝</Text>
          <Text style={styles.title}>Anotação</Text>
        </View>
        <Pressable onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.ruledPaper}>
        {/* Linhas decorativas por trás do texto */}
        <View pointerEvents="none" style={styles.linesContainer}>
          {ruledLines.map((_, index) => <View key={index} style={styles.ruledLine} />)}
        </View>
        <TextInput
          multiline
          onChangeText={onContentChange}
          onContentSizeChange={({ nativeEvent }) => {
            setInputHeight(Math.max(48, Math.ceil(nativeEvent.contentSize.height)));
          }}
          placeholder="Digite sua anotação..."
          placeholderTextColor="#737980"
          scrollEnabled={false}
          style={[styles.textInput, { minHeight: inputHeight }]}
          value={item.content}
        />
      </View>
    </View>
  );
}
```

Estilos do papel pautado:
- `ruledPaper`: `position: 'relative'`, `backgroundColor: 'rgba(0, 0, 0, 0.025)'`, `borderRadius: 6`
- `ruledLine`: `height: 22`, `borderBottomWidth: StyleSheet.hairlineWidth`, `borderBottomColor: 'rgba(74, 108, 137, 0.24)'`
- `textInput`: `fontSize: 15`, `lineHeight: 22` (alinha com as linhas pautadas)

---

## 8. Hook `useCardBackItems`

Gerencia o CRUD dos blocos do verso, usando Firestore como backend:

```ts
export function useCardBackItems(cardId: string) {
  const [items, setItems] = useState<CardBackItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  // Carrega itens ao montar
  // addPhotoItem(source: 'camera' | 'library') – tira/escolhe foto e persiste
  // addAudioItem() – cria bloco de áudio vazio
  // addTextItem() – cria bloco de texto vazio
  // updateItemContent(id, content) – atualiza conteúdo
  // updateItemCaption(id, caption) – atualiza legenda (fotos)
  // removeItem(item) – remove item e deleta arquivo se foto/áudio

  return { items, isBusy, addPhotoItem, addAudioItem, addTextItem, updateItemContent, updateItemCaption, removeItem };
}
```

---

## 9. Paleta de Cores Completa do Sistema

| Token | Hex | Uso |
|-------|-----|-----|
| Verde primário | `#176B5B` | Ícones de ação, caret, undo/redo, símbolos de lista |
| Texto primário | `#25282E` / `#282C32` | Texto do editor e menus |
| Texto secundário | `#6E737A` | Placeholders, botão cancelar |
| Roxo ativo | `#F1ECFF` | Background do botão ativo na toolbar |
| Roxo indicador | `#8B5CF6` | Sublinhado do botão de cor |
| Verde claro ativo | `#E8F2EF` | Background ativo no menu de foto / TableBlock |
| Borda menu | `#C9CDD3` | Borda de menus flutuantes e toolbar |
| Separador | `#D8DBE0` | Linha vertical separadora na toolbar |
| Vermelho excluir | `#B42318` | Botão excluir |
| Sombra | `#202329` | shadowColor de todos os menus flutuantes |

---

## 10. Padrão de Menus Flutuantes

Todos os menus popup do projeto seguem o mesmo padrão visual:

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
  elevation: 7,    // Android
}
```

- Menus são posicionados via `bottom`/`top` + `left`/`right` relativo ao container pai com `position: 'relative'`
- Itens de menu têm `minHeight: 42` e `paddingHorizontal: 12-14`
- Texto de menu: `fontSize: 14`, `fontWeight: '600'`, `color: '#25282E'`
- Abrir um menu fecha todos os outros (mutuamente exclusivos)

---

## 11. Resumo do Fluxo Completo

1. O `CardEditor` renderiza o `CardFlip` (animação 3D de flip com Reanimated).
2. **FRENTE**: Mostra `CardFront` → contém `CardContentEditor` (RichEditor WYSIWYG). A `FormattingToolbar` + `TableBlock` ficam fora do cartão, no rodapé da tela, e operam via `editorRef`.
3. **VERSO**: Mostra `CardBack` → barra de controles no topo (📷 🎤 📝 ↻) + lista de blocos. Cada bloco é independente (`CardTextBlock` usa `TextInput` simples, não o RichEditor). Quando o verso está visível, a `FormattingToolbar` e o `TableBlock` são ocultados.
4. Todos os menus são popups absolutos com sombra, mutuamente exclusivos dentro de seu componente.
