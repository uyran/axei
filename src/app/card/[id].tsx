import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RichEditor } from 'react-native-pell-rich-editor';

import { CardBackground } from '@/components/card-background';
import { BackEditor } from '@/components/card/back-editor';
import { ContentEditor } from '@/components/card/content-editor';
import { FormattingToolbar } from '@/components/card/formatting-toolbar';
import { TableBlock } from '@/components/card/table-block';
import { colors } from '@/constants/colors';
import { useCards } from '@/hooks/use-cards';
import {
  CARD_PLACEHOLDER_NAME,
  displayCardName,
  hasSignificantContent,
} from '@/utils/cards';

const FLIP_DURATION_MS = 450;

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { getCard, setCardName, setCardFront, setCardBack, deleteCard } = useCards();

  const card = getCard(id);
  const [nameSelection, setNameSelection] = useState<{ start: number; end: number } | undefined>(
    undefined,
  );
  const nameSelectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<TextInput>(null);
  const editorRef = useRef<RichEditor>(null);

  useEffect(() => {
    return () => {
      if (nameSelectionTimer.current) {
        clearTimeout(nameSelectionTimer.current);
      }
    };
  }, []);

  function handleNameFocus() {
    setNameSelection({ start: 0, end: 0 });
    if (nameSelectionTimer.current) {
      clearTimeout(nameSelectionTimer.current);
    }
    nameSelectionTimer.current = setTimeout(() => {
      setNameSelection(undefined);
      nameSelectionTimer.current = null;
    }, 150);
  }

  const rotation = useSharedValue(0);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }],
    zIndex: rotation.value <= 90 ? 1 : 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value + 180}deg` }],
    zIndex: rotation.value > 90 ? 1 : 0,
  }));

  useEffect(() => {
    if (!card) {
      router.back();
    }
  }, [card]);

  useEffect(() => {
    const subscription = navigation.addListener('beforeRemove', (event) => {
      const currentCard = getCard(id);
      if (!currentCard) {
        return;
      }
      if (!hasSignificantContent(currentCard)) {
        deleteCard(id);
        return;
      }
      if (currentCard.name.trim() === '') {
        event.preventDefault();
        Alert.alert(
          'Dá um nome ao cartão',
          'Este cartão tem conteúdo, mas ainda não tem nome. O que deseja fazer?',
          [
            { text: 'Continuar editando', style: 'cancel' },
            {
              text: 'Manter como “Sem título”',
              onPress: () => navigation.dispatch(event.data.action),
            },
            {
              text: 'Descartar cartão',
              style: 'destructive',
              onPress: () => {
                deleteCard(id);
                navigation.dispatch(event.data.action);
              },
            },
          ],
        );
      }
    });
    return subscription;
  }, [navigation, id, getCard, deleteCard]);

  if (!card) {
    return <View style={styles.missing} />;
  }

  function handleSave() {
    nameInputRef.current?.blur();
    setNameSelection(undefined);
    editorRef.current?.dismissKeyboard();
    Keyboard.dismiss();
  }

  function handleFlip() {
    nameInputRef.current?.blur();
    setNameSelection(undefined);
    editorRef.current?.dismissKeyboard();
    Keyboard.dismiss();
    const target = rotation.value < 90 ? 180 : 0;
    rotation.value = withTiming(target, { duration: FLIP_DURATION_MS });
  }

  function handleDelete() {
    if (!card) {
      return;
    }
    Alert.alert(
      'Excluir cartão',
      `Excluir o cartão “${displayCardName(card)}”? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteCard(card.id);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Cartão</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Opções do cartão"
          onPress={handleDelete}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.cardStage}>
        <Animated.View style={[styles.cardFace, frontStyle]}>
          <CardBackground seed={card.backgroundSeed} style={styles.faceBackground} />
          <View style={styles.faceContent}>
            <View style={styles.frontStrip}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Salvar e recolher teclado"
                onPress={handleSave}
                hitSlop={8}
                style={({ pressed }) => [styles.stripButton, pressed && styles.pressed]}
              >
                <Ionicons name="save-outline" size={24} color={colors.textMuted} />
              </Pressable>
              <TextInput
                ref={nameInputRef}
                style={styles.nameInput}
                value={card.name}
                selection={nameSelection}
                onChangeText={(text) => {
                  setCardName(card.id, text);
                  setNameSelection(undefined);
                }}
                onFocus={handleNameFocus}
                placeholder={CARD_PLACEHOLDER_NAME}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Nome do cartão"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Girar para o verso"
                onPress={handleFlip}
                hitSlop={8}
                style={({ pressed }) => [styles.stripButton, pressed && styles.pressed]}
              >
                <Ionicons name="sync-outline" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.editorBox}>
              <ContentEditor
                content={card.front}
                editorRef={editorRef}
                onChange={(html) => setCardFront(card.id, html)}
              />
            </View>
            <View style={styles.tools}>
              <FormattingToolbar editorRef={editorRef} />
              <TableBlock editorRef={editorRef} />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.cardFace, backStyle]}>
          <CardBackground seed={card.backgroundSeed} style={styles.faceBackground} />
          <View style={styles.faceContent}>
            <View style={styles.frontStrip}>
              <View style={styles.stripButton}>
                <Image
                  source={require('../../../assets/images/Axei.png')}
                  style={styles.backIcon}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.backTitle}>Verso</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Girar para a frente"
                onPress={handleFlip}
                hitSlop={8}
                style={({ pressed }) => [styles.stripButton, pressed && styles.pressed]}
              >
                <Ionicons name="sync-outline" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <BackEditor
              back={card.back}
              onChange={(back) => setCardBack(card.id, back)}
            />
          </View>
        </Animated.View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  missing: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pressed: {
    opacity: 0.6,
  },
  cardStage: {
    flex: 1,
    margin: 16,
  },
  cardFace: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    backgroundColor: colors.surface,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  keyboardView: {
    flex: 1,
  },
  faceBackground: {
    borderRadius: 20,
  },
  faceContent: {
    flex: 1,
    padding: 14,
  },
  editorBox: {
    flex: 1,
    marginTop: 8,
    marginBottom: 4,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 8,
    paddingTop: 6,
    overflow: 'hidden',
  },
  frontStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stripButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 6,
  },
  backIcon: {
    width: 26,
    height: 26,
  },
  backTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
