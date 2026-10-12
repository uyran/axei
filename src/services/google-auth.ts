import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { AuthResult } from '@/types/auth';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

function mapGoogleError(message: string): string {
  if (
    message.includes('not enabled') ||
    message.includes('not supported') ||
    message.includes('not configured') ||
    message.includes('provider not')
  ) {
    return 'Login com Google ainda não está disponível. Configure o provedor Google no Supabase ou use e-mail e senha.';
  }
  if (message.includes('fetch') || message.includes('Network request failed')) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }
  return 'Não foi possível concluir a operação com o Google. Tente novamente.';
}

function describeUrl(url: string): string {
  const [base] = url.split(/[#?]/);
  return base;
}

function isAuthRedirectUrl(url: string): boolean {
  return /(access_token|refresh_token|error|code)=/.test(url);
}

let pendingRedirect: ((url: string) => void) | null = null;
let listenerInstalled = false;

function handleIncomingUrl(url: string): void {
  if (!pendingRedirect || !isAuthRedirectUrl(url)) return;
  if (__DEV__) console.log(`[google-auth] deep link recebida url=${describeUrl(url)}`);
  try {
    WebBrowser.dismissBrowser();
  } catch {
    // dismissBrowser não está disponível em todas as plataformas.
  }
  const resolve = pendingRedirect;
  pendingRedirect = null;
  resolve(url);
}

function ensureDeepLinkListener(): void {
  if (listenerInstalled) return;
  listenerInstalled = true;
  Linking.addEventListener('url', ({ url }) => handleIncomingUrl(url));
}

export async function signInWithGoogle(): Promise<AuthResult> {
  ensureDeepLinkListener();
  const redirectTo = makeRedirectUri();
  if (__DEV__) console.log(`[google-auth] redirectTo=${redirectTo}`);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) {
    if (__DEV__) console.log(`[google-auth] signInWithOAuth error=${error.message}`);
    return { ok: false, message: mapGoogleError(error.message) };
  }

  const deepLinkPromise = new Promise<string>((resolve) => {
    pendingRedirect = resolve;
  });
  const browserPromise = WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  let finalUrl: string | null = null;
  try {
    const outcome = await Promise.race([
      browserPromise.then((result) => ({ source: 'browser' as const, result })),
      deepLinkPromise.then((url) => ({ source: 'deeplink' as const, url })),
    ]);

    if (outcome.source === 'deeplink') {
      finalUrl = outcome.url;
    } else if (outcome.result.type === 'success') {
      finalUrl = outcome.result.url;
    } else {
      const graceUrl = await Promise.race([
        deepLinkPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (!graceUrl) {
        if (__DEV__) console.log(`[google-auth] browser type=${outcome.result.type}`);
        return { ok: false, message: 'Login com Google cancelado.' };
      }
      finalUrl = graceUrl;
    }
  } finally {
    pendingRedirect = null;
  }

  if (!finalUrl) {
    return { ok: false, message: 'Login com Google cancelado.' };
  }

  if (__DEV__) console.log(`[google-auth] retorno url=${describeUrl(finalUrl)}`);
  const { params, errorCode } = QueryParams.getQueryParams(finalUrl);
  if (__DEV__) {
    console.log(
      `[google-auth] params keys=${Object.keys(params).join(',')} errorCode=${errorCode ?? 'none'}`,
    );
  }
  if (errorCode || !params.access_token || !params.refresh_token) {
    return {
      ok: false,
      message: 'Não foi possível concluir a operação com o Google. Tente novamente.',
    };
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (sessionError) {
    return { ok: false, message: mapGoogleError(sessionError.message) };
  }

  return { ok: true, needsEmailConfirmation: false };
}
