import { createAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

const APP_SOUND_VOLUME = 0.35;

type AppSoundPlayerProps = {
  source: number;
  enabled: boolean;
};

export function AppSoundPlayer({ source, enabled }: AppSoundPlayerProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const player = createAudioPlayer(source);
    player.volume = APP_SOUND_VOLUME;
    void player.play();

    return () => player.release();
  }, [source, enabled]);

  return null;
}
