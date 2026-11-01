import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardStackItem } from '@/components/card-stack-item';
import { colors } from '@/constants/colors';
import { useCards } from '@/hooks/use-cards';
import { signOut } from '@/services/auth';
import { isEmergencyCard, matchesQuery, sortCardsByName } from '@/utils/cards';

const STACK_STEP = 40;
const CARD_ASPECT_RATIO = 1.2;

export default function HomeScreen() {
  const { cards, hydrated, createNewCard, toggleFavorite } = useCards();
  const { width: windowWidth } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [shuffleDirection, setShuffleDirection] = useState<number>(1);
  const [shuffleAxis, setShuffleAxis] = useState<'x' | 'y' | null>(null);
  const [shuffleIntensity, setShuffleIntensity] = useState<number>(1);
  const shuffleTouchStartY = useRef<number | null>(null);
  const shuffleTouchStartX = useRef<number | null>(null);
  const shuffleTriggered = useRef(false);
  const shuffleJustHappened = useRef(false);
  const verticalScrollGesture = useRef(false);

  const [soundKey, setSoundKey] = useState<number>(0);
  const [selectedSoundUri, setSelectedSoundUri] = useState<any>(null);
  const soundGestureUri = require('../../assets/sounds/sound4.mp3');
  const soundSelectUri = require('../../assets/sounds/sound1.mp3');

  function playGestureSound() {
    setSelectedSoundUri(soundGestureUri);
    setSoundKey((k) => k + 1);
  }

  function playSelectSound() {
    setSelectedSoundUri(soundSelectUri);
    setSoundKey((k) => k + 1);
  }

  function handleStackTouchStart(event: GestureResponderEvent) {
    shuffleTouchStartY.current = event.nativeEvent.pageY;
    shuffleTouchStartX.current = event.nativeEvent.pageX;
    shuffleTriggered.current = false;
    shuffleJustHappened.current = false;
    verticalScrollGesture.current = false;
  }

  function handleStackTouchMove(event: GestureResponderEvent) {
    if (shuffleTriggered.current || shuffleTouchStartY.current == null || shuffleTouchStartX.current == null) {
      return;
    }
    const dy = event.nativeEvent.pageY - shuffleTouchStartY.current;
    const dx = event.nativeEvent.pageX - shuffleTouchStartX.current;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
      verticalScrollGesture.current = true;
      shuffleTriggered.current = true;
      return;
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 64) {
      setShuffleAxis('x');
      setShuffleDirection(dx > 0 ? 1 : -1);
      setShuffleIntensity(2);
      shuffleTriggered.current = true;
      shuffleJustHappened.current = true;
      setShuffleSeed((seed) => seed + 1);
      playGestureSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch((error) => {
        console.log('[haptics] falha ao vibrar', error);
      });
    }
  }

  function handleStackTouchEnd() {
    shuffleTouchStartY.current = null;
    shuffleTouchStartX.current = null;
  }

  function handleOpenCard(id: string) {
    if (verticalScrollGesture.current) {
      return;
    }
    if (shuffleJustHappened.current) {
      shuffleJustHappened.current = false;
      return;
    }
    playSelectSound();
    router.push({ pathname: '/card/[id]', params: { id } });
  }

  const cardWidth = windowWidth - 28;
  const cardHeight = cardWidth * CARD_ASPECT_RATIO;

  const visibleCards = useMemo(() => {
    const filtered = sortCardsByName(cards).filter(
      (card) => matchesQuery(card, query) && (!favoritesOnly || card.favorite),
    );
    if (favoritesOnly) return filtered;

    const regularCards = filtered.filter((card) => !isEmergencyCard(card));
    const emergencyCards = filtered.filter(isEmergencyCard);
    return [...regularCards, ...emergencyCards];
  }, [cards, query, favoritesOnly]);

  const stackHeight =
    visibleCards.length > 0
      ? (visibleCards.length - 1) * STACK_STEP + cardHeight
      : 0;

  function handleCreateCard() {
    const card = createNewCard();
    router.push({ pathname: '/card/[id]', params: { id: card.id } });
  }

  function handleSignOut() {
    if (signingOut) {
      return;
    }
    Alert.alert('Sair da conta', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: confirmSignOut },
    ]);
  }

  async function confirmSignOut() {
    setSigningOut(true);
    try {
      const result = await signOut();
      if (!result.ok) {
        Alert.alert('Não foi possível sair', result.message);
      }
    } catch {
      Alert.alert('Não foi possível sair', 'Tente novamente em instantes.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          onPress={handleSignOut}
          disabled={signingOut}
          hitSlop={8}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.primary} />
        </Pressable>
        <Image
          source={require('../../assets/images/Axei.png')}
          style={styles.appIcon}
          contentFit="contain"
          accessibilityLabel="Ícone do Axei"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favoritesOnly ? 'Mostrar todos os cartões' : 'Mostrar somente favoritos'
          }
          accessibilityState={{ selected: favoritesOnly }}
          onPress={() => setFavoritesOnly((current) => !current)}
          hitSlop={8}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons
            name={favoritesOnly ? 'star' : 'star-outline'}
            size={26}
            color={favoritesOnly ? colors.favorite : colors.primary}
          />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Pesquisar cartões"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            accessibilityLabel="Pesquisar cartões"
          />
          {query !== '' ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Limpar pesquisa">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!hydrated ? null : visibleCards.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {cards.length === 0
              ? 'Toque em + para criar seu primeiro cartão.'
              : favoritesOnly
                ? 'Nenhum cartão favorito ainda. Toque na estrela de um cartão para favoritar.'
                : 'Nenhum cartão encontrado.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.stackScroll}
          contentContainerStyle={{ height: stackHeight + 24 }}
          showsVerticalScrollIndicator={false}
          onTouchStart={handleStackTouchStart}
          onTouchMove={handleStackTouchMove}
          onTouchEnd={handleStackTouchEnd}
        >
          <View style={[styles.stack, { height: stackHeight }]}>
            {visibleCards.map((card, index) => (
              <CardStackItem
                key={card.id}
                card={card}
                width={cardWidth}
                height={cardHeight}
                top={index * STACK_STEP}
                zIndex={index}
                shuffleSeed={shuffleSeed}
                shuffleDirection={shuffleDirection}
                shuffleAxis={shuffleAxis}
                shuffleIntensity={shuffleIntensity}
                onPress={() => handleOpenCard(card.id)}
                onToggleFavorite={() => toggleFavorite(card.id)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Novo cartão"
        onPress={handleCreateCard}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </Pressable>
      {selectedSoundUri && (
        <SoundPlayer uri={selectedSoundUri} key={soundKey} />
      )}
    </SafeAreaView>
  );
}

function SoundPlayer({ uri }: { uri: any }) {
  const sound = useAudioPlayer(uri);
  useEffect(() => {
    void sound.play();
  }, [sound]);
  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIcon: {
    width: 56,
    height: 56,
  },
  pressed: {
    opacity: 0.6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#c0def3',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 8,
  },
  stackScroll: {
    flex: 1,
    marginTop: 14,
  },
  stack: {
    position: 'relative',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabPressed: {
    opacity: 0.85,
  },
});
