import { type RefObject, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RichEditor } from 'react-native-pell-rich-editor';

import { TABLE_2X2_HTML } from '@/utils/card-html';

const TABLE_COLOR = '#EA580C';
const TABLE_SURFACE = '#FFEDD5';

export function TableBlock({ editorRef }: { editorRef: RefObject<RichEditor | null> }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const insertTable = () => {
    editorRef.current?.insertHTML(TABLE_2X2_HTML);
    setIsMenuOpen(false);
  };

  const changeCurrentTable = (operation: 'row' | 'column') => {
    const mutation =
      operation === 'row'
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
        style={({ pressed }) => [
          styles.button,
          isMenuOpen && styles.buttonActive,
          (pressed || isMenuOpen) && styles.pressed,
        ]}
      >
        <Text style={[styles.icon, { color: isMenuOpen ? '#FFFFFF' : TABLE_COLOR }]}>▦</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', zIndex: 3 },
  button: {
    width: 42, height: 48, marginTop: 12, marginLeft: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: TABLE_COLOR, borderRadius: 8,
    backgroundColor: TABLE_SURFACE,
  },
  buttonActive: {
    backgroundColor: TABLE_COLOR,
  },
  pressed: { opacity: 0.6 },
  icon: { fontSize: 27, lineHeight: 30 },
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
