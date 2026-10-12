import { useEffect, useState } from 'react';

import { getCurrentUser, subscribeToAuthChanges } from '@/services/auth';
import type { AuthUserSnapshot } from '@/types/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    getCurrentUser()
      .then((currentUser) => {
        if (isActive) {
          setUser(currentUser);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isActive) {
          setUser(null);
          setLoading(false);
        }
      });

    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      if (isActive) {
        setUser(nextUser);
        setLoading(false);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}
