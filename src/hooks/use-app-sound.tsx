import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

type AppSoundContextValue = {
  soundsEnabled: boolean;
  toggleSounds: () => void;
};

const AppSoundContext = createContext<AppSoundContextValue | null>(null);

export function AppSoundProvider({ children }: PropsWithChildren) {
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const value = useMemo(
    () => ({
      soundsEnabled,
      toggleSounds: () => setSoundsEnabled((enabled) => !enabled),
    }),
    [soundsEnabled],
  );

  return <AppSoundContext.Provider value={value}>{children}</AppSoundContext.Provider>;
}

export function useAppSound(): AppSoundContextValue {
  const context = useContext(AppSoundContext);
  if (!context) {
    throw new Error('useAppSound deve ser usado dentro de AppSoundProvider.');
  }
  return context;
}
