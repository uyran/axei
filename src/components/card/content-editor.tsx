import type { RefObject } from 'react';
import { RichEditor } from 'react-native-pell-rich-editor';

import { normalizeCardContent } from '@/utils/card-html';

const KEEP_ACTIVE_LINE_AT_TOP = `
  (function () {
    var content = document.getElementById('content');
    if (!content) return;

    content.addEventListener('input', function () {
      requestAnimationFrame(function () {
        var selection = window.getSelection();
        if (!selection || !selection.rangeCount || !content.contains(selection.anchorNode)) return;

        var range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);
        var caretRect = range.getBoundingClientRect();

        if (!caretRect.height && selection.anchorNode.nodeType === Node.TEXT_NODE && selection.anchorOffset > 0) {
          range.setStart(selection.anchorNode, selection.anchorOffset - 1);
          range.setEnd(selection.anchorNode, selection.anchorOffset);
          caretRect = range.getBoundingClientRect();
        }

        if (!caretRect.height) {
          var line = selection.anchorNode.nodeType === Node.ELEMENT_NODE
            ? selection.anchorNode
            : selection.anchorNode.parentElement;
          if (!line) return;
          caretRect = line.getBoundingClientRect();
        }

        var contentRect = content.getBoundingClientRect();
        var anchorElement = selection.anchorNode.nodeType === Node.ELEMENT_NODE
          ? selection.anchorNode
          : selection.anchorNode.parentElement;
        var styles = anchorElement ? window.getComputedStyle(anchorElement) : null;
        var lineHeight = styles ? parseFloat(styles.lineHeight) : NaN;
        if (!isFinite(lineHeight) || lineHeight <= 0) {
          var fontSize = styles ? parseFloat(styles.fontSize) : NaN;
          lineHeight = isFinite(fontSize) ? fontSize * 1.5 : caretRect.height;
        }
        if (!isFinite(lineHeight) || lineHeight <= 0) lineHeight = 24;
        var activeLineHeight = caretRect.height;
        if (!isFinite(activeLineHeight) || activeLineHeight <= 0 || activeLineHeight > lineHeight * 1.5) {
          activeLineHeight = lineHeight;
        }

        content.style.paddingBottom = Math.max(0, content.clientHeight - lineHeight - activeLineHeight) + 'px';
        content.scrollTop += caretRect.top - contentRect.top - lineHeight;
      });
    });
  })();
  true;
`;

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
          .pell-content li, .pell-content td, .pell-content blockquote {
            font-size: 22px !important;
          }
          .pell-content h1 { font-size: 24px !important; line-height: 1.3; }
          .pell-content h2 { font-size: 22px !important; line-height: 1.3; }
          h1 { margin: 0 0 10px; font-weight: 700; }
          h2 { margin: 10px 0 6px; font-weight: 600; }
          p  { margin: 0 0 8px; }
          .find-table { width: 100%; margin: 12px 0; border-collapse: collapse; table-layout: fixed; }
          .find-table td { min-width: 72px; height: 48px; padding: 8px; border: 1px solid #737980; vertical-align: top; overflow-wrap: anywhere; }
        `,
      }}
      editorInitializedCallback={() => editorRef.current?.injectJavascript(KEEP_ACTIVE_LINE_AT_TOP)}
      initialContentHTML={normalizeCardContent(content)}
      initialHeight={260}
      onChange={onChange}
      pasteAsPlainText
      placeholder="Escreva aqui o conteúdo da frente do cartão"
      style={{ flex: 1, minHeight: 0, backgroundColor: 'transparent' }}
      useContainer={false}
    />
  );
}
