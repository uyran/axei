import { type RefObject, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { actions, RichEditor } from 'react-native-pell-rich-editor';

interface FormattingToolbarProps {
  editorRef: RefObject<RichEditor | null>;
}

const COLORS = ['#202124', '#176B5B', '#A33A2B', '#315CA8', '#FF0000', '#FFEB3B'];

const STYLE_COLOR = '#7C3AED';
const FORMAT_COLOR = '#2563EB';
const LIST_COLOR = '#0D9488';
const TEXT_COLOR_MENU_COLOR = '#8B5CF6';
const HISTORY_COLOR = '#176B5B';

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

      <ScrollView
        contentContainerStyle={styles.content}
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        style={styles.toolbar}
      >
        <Pressable
          accessibilityLabel={isTextStyleMenuOpen ? 'Fechar estilos de texto' : 'Escolher estilo de texto'}
          onPress={toggleTextStyleMenu}
          style={[styles.button, styles.styleButton, isTextStyleMenuOpen && styles.styleButtonActive]}
        >
          <Text style={[styles.normalIcon, { color: isTextStyleMenuOpen ? '#FFFFFF' : STYLE_COLOR }]}>Aa</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Negrito"
          onPress={() => action(actions.setBold)}
          style={[styles.button, styles.formatButton]}
        >
          <Text style={[styles.boldIcon, { color: FORMAT_COLOR }]}>B</Text>
        </Pressable>

        <Pressable
          accessibilityLabel={isListMenuOpen ? 'Fechar listas e tabelas' : 'Escolher lista ou tabela'}
          onPress={toggleListMenu}
          style={[styles.button, styles.listButton, isListMenuOpen && styles.listButtonActive]}
        >
          <Text style={[styles.listIcon, { color: isListMenuOpen ? '#FFFFFF' : LIST_COLOR }]}>☷</Text>
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          accessibilityLabel={isColorMenuOpen ? 'Fechar cores do texto' : 'Escolher cor do texto'}
          onPress={toggleColorMenu}
          style={[styles.button, styles.textColorButton, isColorMenuOpen && styles.textColorButtonActive]}
        >
          <View style={styles.colorIcon}>
            <Text style={[styles.colorLetter, { color: isColorMenuOpen ? '#FFFFFF' : TEXT_COLOR_MENU_COLOR }]}>A</Text>
            <View style={[styles.colorUnderline, { backgroundColor: isColorMenuOpen ? '#FFFFFF' : TEXT_COLOR_MENU_COLOR }]} />
          </View>
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          accessibilityLabel="Desfazer"
          onPress={() => action(actions.undo)}
          style={[styles.button, styles.historyButton]}
        >
          <Text style={[styles.historyIcon, { color: HISTORY_COLOR }]}>↶</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative', zIndex: 2 },
  toolbar: {
    flex: 1,
    height: 70,
  },
  content: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, gap: 10 },
  button: {
    width: 42, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: '#000000',
  },
  styleButton: { backgroundColor: '#DBEAFE', marginRight: 10 },
  styleButtonActive: { backgroundColor: '#DBEAFE' },
  formatButton: { backgroundColor: '#DBEAFE', marginRight: 10 },
  listButton: { backgroundColor: '#DBEAFE', marginLeft: 4 },
  listButtonActive: { backgroundColor: '#DBEAFE' },
  textColorButton: { backgroundColor: '#DBEAFE' },
  textColorButtonActive: { backgroundColor: '#DBEAFE' },
  historyButton: { backgroundColor: '#DBEAFE' },
  normalIcon: { fontSize: 16, fontWeight: '600' },
  boldIcon: { fontSize: 19, fontWeight: '800' },
  listIcon: { fontSize: 17, fontWeight: '600' },
  historyIcon: { fontSize: 23 },
  colorIcon: { alignItems: 'center', justifyContent: 'center' },
  colorLetter: { fontSize: 18, fontWeight: '600', lineHeight: 20 },
  colorUnderline: { width: 18, height: 3, marginTop: 2, borderRadius: 2 },
  separator: { width: 1, height: 26, backgroundColor: '#D8DBE0' },
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
    minWidth: 160, overflow: 'hidden',
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C9CDD3',
    backgroundColor: '#FFFFFF',
    shadowColor: '#202329', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 7, elevation: 7,
  },
  listMenuItem: { minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  listMenuSymbol: { width: 22, color: '#176B5B', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  listMenuText: { color: '#25282E', fontSize: 14, fontWeight: '600' },
});
