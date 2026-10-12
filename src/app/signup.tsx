import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { AuthTextField } from '@/components/auth-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { colors } from '@/constants/colors';
import { signUp } from '@/services/auth';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '@/utils/validation';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (loading) {
      return;
    }
    setFormError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmationError(null);

    const trimmedEmail = email.trim().toLowerCase();
    let valid = true;

    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Informe um e-mail válido.');
      valid = false;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      valid = false;
    }
    if (confirmation !== password) {
      setConfirmationError('As senhas não coincidem.');
      valid = false;
    }
    if (!valid) {
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({ email: trimmedEmail, password });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      if (result.needsEmailConfirmation) {
        setSuccess(trimmedEmail);
        return;
      }
      router.replace('/');
    } catch {
      setFormError('Não foi possível concluir a operação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthScreen>
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Conta criada!</Text>
          <Text style={styles.successText}>
            Enviamos um link de confirmação para {success}. Após confirmar o e-mail, volte e
            entre na sua conta.
          </Text>
        </View>
        <PrimaryButton label="Voltar para Entrar" onPress={() => router.replace('/login')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Cadastre-se para começar a usar o Axei</Text>
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
        placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
        autoComplete="new-password"
        secure
        error={passwordError}
      />
      <AuthTextField
        label="Confirmar senha"
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder="Repita a senha"
        autoComplete="new-password"
        secure
        error={confirmationError}
      />

      <PrimaryButton label="Criar conta" onPress={handleSignup} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Já tem uma conta?</Text>
        <PrimaryButton
          label="Entrar"
          variant="outline"
          onPress={() => router.replace('/login')}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
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
  successBox: {
    backgroundColor: colors.successSurface,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'center',
  },
  successText: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
