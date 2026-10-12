import { useEffect, useState } from 'react';

import { isLocalMediaUri, resolveMediaUri } from '@/services/media';

type ResolvedState = { uri: string; value: string | null };

export function useMediaUri(uri: string): string | null {
  const [state, setState] = useState<ResolvedState | null>(null);

  useEffect(() => {
    if (isLocalMediaUri(uri)) {
      return;
    }
    let active = true;
    resolveMediaUri(uri)
      .then((value) => {
        if (active) {
          setState({ uri, value });
        }
      })
      .catch(() => {
        // Mantém null; nova tentativa acontece quando o uri mudar.
      });
    return () => {
      active = false;
    };
  }, [uri]);

  if (isLocalMediaUri(uri)) {
    return uri;
  }
  return state && state.uri === uri ? state.value : null;
}
