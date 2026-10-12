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
      initialHeight={260}
      onChange={onChange}
      pasteAsPlainText
      placeholder="Escreva aqui o conteúdo da frente do cartão"
      style={{ flex: 1, minHeight: 220, backgroundColor: 'transparent' }}
      useContainer={false}
    />
  );
}
