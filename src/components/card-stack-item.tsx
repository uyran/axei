import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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
  shuffleSeed?: number;
  shuffleDirection?: number;
  shuffleAxis?: 'x' | 'y' | null;
  shuffleIntensity?: number;
  showFrontPreview?: boolean;
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
  shuffleSeed = 0,
  shuffleDirection = 1,
  shuffleAxis = null,
  shuffleIntensity = 1,
  showFrontPreview = false,
  onPress,
  onToggleFavorite,
}: CardStackItemProps) {
  const emergency = isEmergencyCard(card);
  const shuffleX = useSharedValue(0);
  const shuffleY = useSharedValue(0);
  const shuffleRotate = useSharedValue(0);

  useEffect(() => {
    if (!shuffleSeed) {
      return;
    }
    const intensity = shuffleAxis === 'x' ? shuffleIntensity * 2.5 : shuffleIntensity;
    const bias = shuffleDirection === -1 ? 1 : -1;
    const direction = Math.random() < 0.5 ? bias : bias * -1;
    const baseDistance = 50 + Math.random() * 80;
    const baseAngle = 4 + Math.random() * 8;

    if (shuffleAxis === 'x') {
      const distance = direction * Math.min(width * (0.12 + Math.random() * 0.06), 90);
      const offsetsX = [
        distance,
        -distance * (0.35 + Math.random() * 0.3),
        distance * (0.2 + Math.random() * 0.35),
        -distance * Math.random() * 0.2,
        0,
      ];
      const offsetsY = [
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        0,
      ];
      const angle = direction * (2 + Math.random() * 2);
      const offsetsRotate = [
        angle,
        -angle * (0.35 + Math.random() * 0.3),
        angle * (0.2 + Math.random() * 0.35),
        -angle * Math.random() * 0.2,
        0,
      ];
      shuffleX.value = withSequence(
        withTiming(offsetsX[0], { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(offsetsX[1], { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(offsetsX[2], { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(offsetsX[3], { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(offsetsX[4], { duration: 170, easing: Easing.inOut(Easing.quad) }),
      );
      shuffleY.value = withSequence(
        withTiming(offsetsY[0], { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(offsetsY[1], { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(offsetsY[2], { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(offsetsY[3], { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(offsetsY[4], { duration: 170, easing: Easing.inOut(Easing.quad) }),
      );
      shuffleRotate.value = withSequence(
        withTiming(offsetsRotate[0], { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(offsetsRotate[1], { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(offsetsRotate[2], { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(offsetsRotate[3], { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(offsetsRotate[4], { duration: 170, easing: Easing.inOut(Easing.quad) }),
      );
    } else {
      const distance = direction * baseDistance * intensity;
      const angle = direction * baseAngle * intensity;
      shuffleX.value = withSequence(
        withTiming(distance, { duration: 240, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.quad) }),
      );
      shuffleRotate.value = withSequence(
        withTiming(angle, { duration: 240, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.quad) }),
      );
    }
  }, [shuffleSeed, shuffleDirection, shuffleAxis, shuffleIntensity, width, shuffleX, shuffleY, shuffleRotate]);

  const shuffleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shuffleX.value },
      { translateY: shuffleY.value },
      { perspective: 1000 },
      { rotate: `${shuffleRotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.cardSlot, { top, zIndex }, shuffleStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir cartão ${displayCardName(card)}`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, { width, height }, pressed && styles.pressed]}
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
      {emergency || showFrontPreview ? (
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginHorizontal: 14,
  },
  card: {
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
