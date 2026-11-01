import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

import { colors } from '@/constants/colors';
import { AppSoundProvider } from '@/hooks/use-app-sound';
import { useAuth } from '@/hooks/use-auth';
import { CardsProvider } from '@/hooks/use-cards';

const PUBLIC_SEGMENTS = ['login', 'signup', 'recover'];

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();

  const currentSegment = segments[0];
  const isPublicRoute =
    typeof currentSegment === 'string' && PUBLIC_SEGMENTS.includes(currentSegment);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user && !isPublicRoute) {
      router.replace('/login');
    } else if (user && isPublicRoute) {
      router.replace('/');
    }
  }, [loading, user, isPublicRoute]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppSoundProvider>
        <CardsProvider>
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: 'Entrar' }} />
            <Stack.Screen name="signup" options={{ title: 'Criar conta' }} />
            <Stack.Screen name="recover" options={{ title: 'Recuperar senha' }} />
            <Stack.Screen name="card/[id]" options={{ headerShown: false }} />
          </Stack>
        </CardsProvider>
      </AppSoundProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
