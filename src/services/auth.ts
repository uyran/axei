import type { AuthError } from '@supabase/supabase-js';

import type { AuthCredentials, AuthResult, AuthUserSnapshot } from '@/types/auth';

import { supabase } from './supabase';

function mapAuthError(error: AuthError): string {
  const code = 'code' in error ? (error.code ?? '') : '';
  const message = error.message ?? '';

  if (
    code === 'invalid_credentials' ||
    message.includes('Invalid login credentials')
  ) {
    return 'E-mail ou senha incorretos.';
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'Este e-mail já está cadastrado. Use "Esqueci minha senha" para recuperar o acesso.';
  }
  if (code === 'weak_password' || message.includes('Password should')) {
    return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
  }
  if (code === 'email_not_confirmed' || message.includes('Email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  }
  if (
    code === 'over_email_send_rate_limit' ||
    message.includes('For security purposes')
  ) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }
  if (code === 'user_not_found' || message.includes('User not found')) {
    return 'Não foi possível encontrar uma conta com este e-mail.';
  }
  if (
    error.name === 'AuthRetryableFetchError' ||
    message.includes('fetch') ||
    message.includes('Network request failed')
  ) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }

  return 'Não foi possível concluir a operação. Tente novamente.';
}

function toFailure(error: AuthError): AuthResult {
  return { ok: false, message: mapAuthError(error) };
}

export async function signUp({
  email,
  password,
}: AuthCredentials): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return toFailure(error);
  }
  return { ok: true, needsEmailConfirmation: data.session === null };
}

export async function signIn({
  email,
  password,
}: AuthCredentials): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return toFailure(error);
  }
  return { ok: true, needsEmailConfirmation: false };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return toFailure(error);
  }
  return { ok: true, needsEmailConfirmation: false };
}

export async function resetPassword(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    return toFailure(error);
  }
  return { ok: true, needsEmailConfirmation: false };
}

export async function getCurrentUser(): Promise<AuthUserSnapshot | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return null;
  }
  return { id: user.id, email: user.email ?? null };
}

export function subscribeToAuthChanges(
  callback: (user: AuthUserSnapshot | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    callback(user ? { id: user.id, email: user.email ?? null } : null);
  });
  return () => data.subscription.unsubscribe();
}
