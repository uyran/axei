import { useState, type ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { colors } from '@/constants/colors';

type AuthTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: ComponentProps<typeof TextInput>['autoComplete'];
  secure?: boolean;
  error?: string | null;
};

export function AuthTextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoComplete,
  secure = false,
  error,
}: AuthTextFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          secureTextEntry={secure && !visible}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setVisible((current) => !current)}
            hitSlop={8}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{visible ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  toggle: {
    paddingLeft: 12,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
});
