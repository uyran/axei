import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useMediaUri } from '@/hooks/use-media-uri';
import { isLocalMediaUri } from '@/services/media';
import type { BackItem } from '@/types/card';
import { deleteCardFile, persistCardFile } from '@/utils/card-files';
import { generateId } from '@/utils/cards';

type BackEditorProps = {
  back: BackItem[];
  onChange: (back: BackItem[]) => void;
};

const NOTE_COLOR = '#7C3AED';
const PHOTO_COLOR = '#2563EB';
const RECORD_COLOR = '#DC2626';

type AudioItem = Extract<BackItem, { type: 'audio' }>;

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function RemoveButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
    >
      <Ionicons name="close-circle" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

function AudioRow({ item, onRemove }: { item: AudioItem; onRemove: () => void }) {
  const uri = useMediaUri(item.uri);
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  return (
    <View style={styles.audioRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pausar áudio' : 'Tocar áudio'}
        onPress={() => {
          if (!uri) {
            return;
          }
          if (status.playing) {
            player.pause();
          } else {
            player.play();
          }
        }}
        style={({ pressed }) => [styles.audioPlayButton, pressed && styles.pressed]}
      >
        <Ionicons
          name={status.playing ? 'pause-circle' : 'play-circle'}
          size={30}
          color={uri ? colors.primary : colors.textMuted}
        />
      </Pressable>
      <Text style={styles.audioDuration}>{formatDuration(item.durationMs)}</Text>
      <RemoveButton onPress={onRemove} label="Remover áudio" />
    </View>
  );
}

function PhotoRow({ item, onRemove }: { item: Extract<BackItem, { type: 'photo' }>; onRemove: () => void }) {
  const uri = useMediaUri(item.uri);

  return (
    <View style={styles.photoBox}>
      {uri ? (
        <Image source={{ uri }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={[styles.photo, styles.photoPending]}>
          <Text style={styles.photoPendingText}>Carregando foto…</Text>
        </View>
      )}
      <View style={styles.photoFooter}>
        <Text style={styles.photoLabel}>Foto</Text>
        <RemoveButton onPress={onRemove} label="Remover foto" />
      </View>
    </View>
  );
}

export function BackEditor({ back, onChange }: BackEditorProps) {
  const [busy, setBusy] = useState(false);
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });
  const recorderState = useAudioRecorderState(recorder);
  const isRecording = recorderState.isRecording;

  function removeItem(id: string) {
    const item = back.find((entry) => entry.id === id);
    if (item && (item.type === 'photo' || item.type === 'audio') && isLocalMediaUri(item.uri)) {
      deleteCardFile(item.uri);
    }
    onChange(back.filter((entry) => entry.id !== id));
  }

  function updateNote(id: string, text: string) {
    onChange(
      back.map((item) => (item.id === id && item.type === 'note' ? { ...item, text } : item)),
    );
  }

  function handleAddNote() {
    onChange([
      ...back,
      { id: generateId(), type: 'note', text: '', createdAt: new Date().toISOString() },
    ]);
  }

  async function handleAddPhoto() {
    if (busy) {
      return;
    }
    Alert.alert('Adicionar foto', 'Como você quer adicionar a foto?', [
      { text: 'Tirar foto', onPress: () => void pickPhoto('camera') },
      { text: 'Escolher da galeria', onPress: () => void pickPhoto('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function pickPhoto(source: 'camera' | 'gallery') {
    setBusy(true);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Câmera bloqueada',
            'Permita o acesso à câmera nas configurações do aparelho para tirar fotos.',
          );
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Galeria bloqueada',
            'Permita o acesso às fotos nas configurações do aparelho para adicionar imagens ao cartão.',
          );
          return;
        }
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      const uri = await persistCardFile(asset.uri, 'jpg');
      onChange([
        ...back,
        { id: generateId(), type: 'photo', uri, createdAt: new Date().toISOString() },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar a foto. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleRecording() {
    if (busy) {
      return;
    }
    if (isRecording) {
      setBusy(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          onChange([
            ...back,
            {
              id: generateId(),
              type: 'audio',
              uri,
              durationMs: Math.round(recorderState.durationMillis),
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } catch {
        Alert.alert('Erro', 'Não foi possível salvar a gravação. Tente novamente.');
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microfone bloqueado',
          'Permita o uso do microfone nas configurações do aparelho para gravar áudios.',
        );
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a gravação. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.editor}>
      <View style={styles.itemsBox}>
        <ScrollView
          style={styles.itemsScroll}
          contentContainerStyle={styles.itemsContent}
          keyboardShouldPersistTaps="handled"
        >
          {back.length === 0 ? (
            <Text style={styles.empty}>
              Sem itens no verso ainda.{'\n'}Adicione anotações, fotos ou áudio pela barra
              abaixo.
            </Text>
          ) : (
            back.map((item) => {
              if (item.type === 'note') {
                return (
                  <View key={item.id} style={styles.noteBox}>
                    <TextInput
                      style={styles.noteInput}
                      multiline
                      value={item.text}
                      onChangeText={(text) => updateNote(item.id, text)}
                      placeholder="Anotação"
                      placeholderTextColor={colors.textMuted}
                      accessibilityLabel="Anotação"
                    />
                    <RemoveButton
                      onPress={() => removeItem(item.id)}
                      label="Remover anotação"
                    />
                  </View>
                );
              }
              if (item.type === 'photo') {
                return (
                  <PhotoRow
                    key={item.id}
                    item={item}
                    onRemove={() => removeItem(item.id)}
                  />
                );
              }
              return <AudioRow key={item.id} item={item} onRemove={() => removeItem(item.id)} />;
            })
          )}
        </ScrollView>
      </View>

      <View style={styles.toolbar}>
        {isRecording ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Parar gravação"
            onPress={handleToggleRecording}
            disabled={busy}
            style={({ pressed }) => [
              styles.recordingBar,
              (pressed || busy) && styles.pressed,
            ]}
          >
            <Ionicons name="stop-circle" size={24} color={colors.onPrimary} />
            <Text style={styles.recordingBarLabel}>
              Parar gravação — {formatDuration(recorderState.durationMillis)}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar anotação"
              onPress={handleAddNote}
              style={({ pressed }) => [styles.toolButton, styles.noteButton, pressed && styles.pressed]}
            >
              <Ionicons name="document-text-outline" size={20} color={NOTE_COLOR} />
              <Text style={[styles.toolLabel, styles.noteLabel]}>Nota</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar foto"
              onPress={handleAddPhoto}
              disabled={busy}
              style={({ pressed }) => [
                styles.toolButton,
                styles.photoButton,
                (busy || pressed) && styles.pressed,
                busy && styles.muted,
              ]}
            >
              <Ionicons name="camera-outline" size={20} color={PHOTO_COLOR} />
              <Text style={[styles.toolLabel, styles.photoToolLabel]}>Foto</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gravar áudio"
              onPress={handleToggleRecording}
              disabled={busy}
              style={({ pressed }) => [
                styles.toolButton,
                styles.recordButton,
                (busy || pressed) && styles.pressed,
                busy && styles.muted,
              ]}
            >
              <Ionicons name="mic-outline" size={20} color={RECORD_COLOR} />
              <Text style={[styles.toolLabel, styles.recordLabel]}>Gravar</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    flex: 1,
  },
  itemsBox: {
    flex: 1,
    marginTop: 8,
    marginBottom: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 8,
    paddingTop: 6,
    overflow: 'hidden',
  },
  itemsScroll: {
    flex: 1,
  },
  itemsContent: {
    paddingBottom: 8,
    gap: 10,
  },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 4,
  },
  noteInput: {
    flex: 1,
    minHeight: 56,
    fontSize: 15,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  photoBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 180,
    backgroundColor: colors.border,
  },
  photoPending: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPendingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  photoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10,
  },
  photoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 8,
  },
  audioPlayButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioDuration: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  removeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  muted: {
    opacity: 0.5,
  },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  noteButton: {
    backgroundColor: '#DBEAFE',
  },
  photoButton: {
    backgroundColor: '#DBEAFE',
  },
  recordButton: {
    backgroundColor: '#DBEAFE',
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: RECORD_COLOR,
  },
  recordingBarLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  toolLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteLabel: {
    color: NOTE_COLOR,
  },
  photoToolLabel: {
    color: PHOTO_COLOR,
  },
  recordLabel: {
    color: RECORD_COLOR,
  },
});
