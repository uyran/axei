import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { AuthTextField } from '@/components/auth-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { colors } from '@/constants/colors';
import { signIn } from '@/services/auth';
import { signInWithGoogle } from '@/services/google-auth';
import { isValidEmail } from '@/utils/validation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    if (loading) {
      return;
    }
    setFormError(null);
    setEmailError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Informe um e-mail válido.');
      return;
    }
    if (!password) {
      setFormError('Informe sua senha.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn({ email: trimmedEmail, password });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      router.replace('/');
    } catch {
      setFormError('Não foi possível concluir a operação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (googleLoading) {
      return;
    }
    setFormError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      router.replace('/');
    } catch {
      setFormError('Não foi possível concluir a operação. Tente novamente.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/Axei.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Entre para acessar seus cartões</Text>
      </View>

      {formError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      ) : null}

      <AuthTextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoComplete="email"
        error={emailError}
      />
      <AuthTextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        placeholder="Sua senha"
        autoComplete="password"
        secure
      />

      <PrimaryButton label="Entrar" onPress={handleLogin} loading={loading} />
      <PrimaryButton
        label="Continuar com Google"
        variant="outline"
        onPress={handleGoogle}
        loading={googleLoading}
      />

      <View style={styles.footer}>
        <Pressable onPress={() => router.push('/recover')} hitSlop={8}>
          <Text style={styles.link}>Esqueci minha senha</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
          <Text style={styles.link}>Criar conta</Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.dangerSurface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 4,
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
