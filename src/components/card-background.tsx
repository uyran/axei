import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
} from '@material/material-color-utilities';
import { LinearGradient } from 'expo-linear-gradient';
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

type CardBackgroundData = {
  gradientColors: [string, string];
  shapes: Shape[];
};

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

function hslToHex(h: number, s: number, l: number): string {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = h / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (sector < 1) {
    r = chroma;
    g = x;
  } else if (sector < 2) {
    r = x;
    g = chroma;
  } else if (sector < 3) {
    g = chroma;
    b = x;
  } else if (sector < 4) {
    g = x;
    b = chroma;
  } else if (sector < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }
  const m = lightness - chroma / 2;
  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateBackground(seed: number): CardBackgroundData {
  const random = mulberry32(seed);

  const hue = random() * 360;
  const saturation = 45 + random() * 25;
  const lightness = 38 + random() * 12;
  const sourceHex = hslToHex(hue, saturation, lightness);
  const theme = themeFromSourceColor(argbFromHex(sourceHex));

  const gradientColors: [string, string] = [
    hexFromArgb(theme.palettes.primary.tone(80)),
    hexFromArgb(theme.palettes.primary.tone(94)),
  ];

  const shapeColors = [
    hexFromArgb(theme.palettes.primary.tone(45)),
    hexFromArgb(theme.palettes.secondary.tone(50)),
    hexFromArgb(theme.palettes.tertiary.tone(50)),
    '#FFFFFF',
  ];

  const count = 6 + Math.floor(random() * 4);
  const shapes: Shape[] = [];

  for (let index = 0; index < count; index += 1) {
    const color = shapeColors[Math.floor(random() * shapeColors.length)];
    const opacity = 0.1 + random() * 0.12;
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

  return { gradientColors, shapes };
}

type CardBackgroundProps = {
  seed: number;
  style?: StyleProp<ViewStyle>;
};

export const CardBackground = memo(function CardBackground({
  seed,
  style,
}: CardBackgroundProps) {
  const { gradientColors, shapes } = useMemo(() => generateBackground(seed), [seed]);

  return (
    <View style={[styles.base, style]} pointerEvents="none">
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
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
    overflow: 'hidden',
  },
  glassSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 18,
  },
});
