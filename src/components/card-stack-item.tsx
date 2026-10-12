import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CardBackground } from '@/components/card-background';
import { colors } from '@/constants/colors';
import type { Card } from '@/types/card';
import { displayCardName, EMERGENCY_COLOR, htmlToPlainText, isEmergencyCard } from '@/utils/cards';

type CardStackItemProps = {
  card: Card;
  width: number;
  height: number;
  top: number;
  zIndex: number;
  onPress: () => void;
  onToggleFavorite: () => void;
};

function previewText(html: string): string {
  return htmlToPlainText(html.replace(/<\/p>/gi, '\n'))
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export function CardStackItem({
  card,
  width,
  height,
  top,
  zIndex,
  onPress,
  onToggleFavorite,
}: CardStackItemProps) {
  const emergency = isEmergencyCard(card);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir cartão ${displayCardName(card)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width, height, top, zIndex },
        pressed && styles.pressed,
      ]}
    >
      <CardBackground seed={card.backgroundSeed} />
      <View style={styles.strip}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            card.favorite
              ? `Remover cartão ${displayCardName(card)} dos favoritos`
              : `Adicionar cartão ${displayCardName(card)} aos favoritos`
          }
          accessibilityState={{ selected: card.favorite }}
          onPress={onToggleFavorite}
          hitSlop={8}
          style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressedIcon]}
        >
          <Ionicons
            name={card.favorite ? 'star' : 'star-outline'}
            size={20}
            color={card.favorite ? colors.favorite : colors.textMuted}
          />
        </Pressable>
        <Text style={[styles.name, emergency && styles.nameEmergency]} numberOfLines={1}>
          {displayCardName(card)}
        </Text>
        <View style={styles.favoriteButton} />
      </View>
      <View style={styles.nameDivider} />
      {emergency ? (
        <ScrollView
          style={styles.previewScroll}
          contentContainerStyle={styles.previewScrollContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.frontPreview}>{previewText(card.front)}</Text>
        </ScrollView>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginHorizontal: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    backgroundColor: colors.surface,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  favoriteButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedIcon: {
    opacity: 0.5,
  },
  name: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  nameEmergency: {
    color: EMERGENCY_COLOR,
  },
  nameDivider: {
    height: 1,
    marginHorizontal: 10,
    backgroundColor: colors.borderStrong,
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    paddingBottom: 12,
  },
  frontPreview: {
    paddingHorizontal: 14,
    paddingTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
});
