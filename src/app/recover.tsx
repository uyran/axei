import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { AuthTextField } from '@/components/auth-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { colors } from '@/constants/colors';
import { resetPassword } from '@/services/auth';
import { isValidEmail } from '@/utils/validation';

export default function RecoverScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRecover() {
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

    setLoading(true);
    try {
      const result = await resetPassword(trimmedEmail);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setSuccess(true);
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
          <Text style={styles.successTitle}>Link enviado</Text>
          <Text style={styles.successText}>
            Se existir uma conta com este e-mail, você receberá as instruções de redefinição
            de senha. Confira sua caixa de entrada.
          </Text>
        </View>
        <PrimaryButton label="Voltar para Entrar" onPress={() => router.replace('/login')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>
          Informe seu e-mail e enviaremos as instruções de redefinição
        </Text>
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

      <PrimaryButton label="Enviar instruções" onPress={handleRecover} loading={loading} />

      <PrimaryButton
        label="Voltar para Entrar"
        variant="outline"
        onPress={() => router.replace('/login')}
      />
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
    lineHeight: 21,
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
});
