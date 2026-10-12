import { memo, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Shape =
  | {
      kind: 'circle';
      left: number;
      top: number;
      size: number;
      color: string;
      opacity: number;
    }
  | {
      kind: 'bar';
      left: number;
      top: number;
      width: number;
      height: number;
      rotate: number;
      radius: number;
      color: string;
      opacity: number;
    }
  | {
      kind: 'diamond';
      left: number;
      top: number;
      size: number;
      rotate: number;
      radius: number;
      color: string;
      opacity: number;
    };

const GLASS_PALETTE = [
  '#7DD3FC',
  '#A5B4FC',
  '#C4B5FD',
  '#F9A8D4',
  '#FCD34D',
  '#6EE7B7',
  '#FDBA74',
  '#93C5FD',
  '#FCA5A5',
];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateShapes(seed: number): Shape[] {
  const random = mulberry32(seed);
  const count = 6 + Math.floor(random() * 4);
  const shapes: Shape[] = [];

  for (let index = 0; index < count; index += 1) {
    const color = GLASS_PALETTE[Math.floor(random() * GLASS_PALETTE.length)];
    const opacity = 0.14 + random() * 0.16;
    const kind = random();
    const left = random() * 0.75;
    const top = random() * 0.75;

    if (kind < 0.38) {
      shapes.push({
        kind: 'circle',
        left,
        top,
        size: 0.22 + random() * 0.28,
        color,
        opacity,
      });
    } else if (kind < 0.78) {
      shapes.push({
        kind: 'bar',
        left,
        top,
        width: 0.35 + random() * 0.45,
        height: 0.05 + random() * 0.08,
        rotate: -40 + random() * 80,
        radius: 999,
        color,
        opacity,
      });
    } else {
      shapes.push({
        kind: 'diamond',
        left,
        top,
        size: 0.16 + random() * 0.2,
        rotate: 30 + random() * 60,
        radius: 6 + random() * 18,
        color,
        opacity,
      });
    }
  }

  return shapes;
}

type CardBackgroundProps = {
  seed: number;
  style?: StyleProp<ViewStyle>;
};

export const CardBackground = memo(function CardBackground({
  seed,
  style,
}: CardBackgroundProps) {
  const shapes = useMemo(() => generateShapes(seed), [seed]);

  return (
    <View style={[styles.base, style]} pointerEvents="none">
      {shapes.map((shape, index) => {
        if (shape.kind === 'circle') {
          return (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: `${shape.left * 100}%`,
                top: `${shape.top * 100}%`,
                width: `${shape.size * 100}%`,
                aspectRatio: 1,
                borderRadius: 999,
                backgroundColor: shape.color,
                opacity: shape.opacity,
              }}
            />
          );
        }
        if (shape.kind === 'bar') {
          return (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: `${shape.left * 100}%`,
                top: `${shape.top * 100}%`,
                width: `${shape.width * 100}%`,
                height: `${shape.height * 100}%`,
                borderRadius: shape.radius,
                backgroundColor: shape.color,
                opacity: shape.opacity,
                transform: [{ rotate: `${shape.rotate}deg` }],
              }}
            />
          );
        }
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: `${shape.left * 100}%`,
              top: `${shape.top * 100}%`,
              width: `${shape.size * 100}%`,
              aspectRatio: 1,
              borderRadius: shape.radius,
              backgroundColor: shape.color,
              opacity: shape.opacity,
              transform: [{ rotate: `${shape.rotate}deg` }],
            }}
          />
        );
      })}
      <View style={styles.glassSheen} />
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  glassSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 18,
  },
});
