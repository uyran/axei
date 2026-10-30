import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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
import {
  EMERGENCY_COLOR,
  isEmergencyCard,
  matchesQuery,
  sortCardsByName,
} from '@/utils/cards';

const STACK_STEP = 40;
const CARD_ASPECT_RATIO = 1.2;

export default function HomeScreen() {
  const { cards, hydrated, createNewCard, createEmergencyCard, toggleFavorite } = useCards();
  const { width: windowWidth } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const shuffleTouchStartY = useRef<number | null>(null);
  const shuffleTriggered = useRef(false);
  const shuffleJustHappened = useRef(false);

  function handleStackTouchStart(event: GestureResponderEvent) {
    shuffleTouchStartY.current = event.nativeEvent.pageY;
    shuffleTriggered.current = false;
    shuffleJustHappened.current = false;
  }

  function handleStackTouchMove(event: GestureResponderEvent) {
    if (shuffleTriggered.current || shuffleTouchStartY.current == null) {
      return;
    }
    const dy = event.nativeEvent.pageY - shuffleTouchStartY.current;
    if (dy > 64) {
      shuffleTriggered.current = true;
      shuffleJustHappened.current = true;
      setShuffleSeed((seed) => seed + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch((error) => {
        console.log('[haptics] falha ao vibrar', error);
      });
    }
  }

  function handleStackTouchEnd() {
    shuffleTouchStartY.current = null;
  }

  function handleOpenCard(id: string) {
    if (shuffleJustHappened.current) {
      shuffleJustHappened.current = false;
      return;
    }
    router.push({ pathname: '/card/[id]', params: { id } });
  }

  const cardWidth = windowWidth - 28;
  const cardHeight = cardWidth * CARD_ASPECT_RATIO;

  const showEmergencyBanner = hydrated && cards.length === 0 && !bannerDismissed;

  const visibleCards = useMemo(() => {
    const filtered = sortCardsByName(cards).filter(
      (card) => matchesQuery(card, query) && (!favoritesOnly || card.favorite),
    );
    const emergency = filtered.filter(isEmergencyCard);
    const normal = filtered.filter((card) => !isEmergencyCard(card));
    return [...normal, ...emergency];
  }, [cards, query, favoritesOnly]);

  const stackHeight =
    visibleCards.length > 0
      ? (visibleCards.length - 1) * STACK_STEP + cardHeight
      : 0;

  function handleCreateCard() {
    const card = createNewCard();
    router.push({ pathname: '/card/[id]', params: { id: card.id } });
  }

  function handleCreateEmergencyCard() {
    const card = createEmergencyCard();
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
          {showEmergencyBanner ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Cartão de emergência</Text>
              <Text style={styles.bannerText}>
                Criar um cartão com os principais números de emergência (190, 192, 193, 199, 191,
                180 e 100)?
              </Text>
              <View style={styles.bannerActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleCreateEmergencyCard}
                  style={({ pressed }) => [styles.bannerButton, styles.bannerConfirm, pressed && styles.pressed]}
                >
                  <Text style={styles.bannerConfirmText}>Criar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setBannerDismissed(true)}
                  style={({ pressed }) => [styles.bannerButton, styles.bannerCancel, pressed && styles.pressed]}
                >
                  <Text style={styles.bannerCancelText}>Agora não</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              {cards.length === 0
                ? 'Toque em + para criar seu primeiro cartão.'
                : favoritesOnly
                  ? 'Nenhum cartão favorito ainda. Toque na estrela de um cartão para favoritar.'
                  : 'Nenhum cartão encontrado.'}
            </Text>
          )}
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
    </SafeAreaView>
  );
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
    backgroundColor: colors.surface,
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
  banner: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: EMERGENCY_COLOR,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: EMERGENCY_COLOR,
    textAlign: 'center',
  },
  bannerText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  bannerButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerConfirm: {
    backgroundColor: EMERGENCY_COLOR,
  },
  bannerConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bannerCancel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  bannerCancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
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
