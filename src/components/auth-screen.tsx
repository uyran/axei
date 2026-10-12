import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

type AuthScreenProps = {
  children: ReactNode;
};

export function AuthScreen({ children }: AuthScreenProps) {
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
});
