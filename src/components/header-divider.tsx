import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

export function HeaderDivider() {
  return (
    <View style={styles.container} accessible={false}>
      <View style={styles.shade} />
      <View style={styles.highlight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 3,
    marginHorizontal: 16,
    marginTop: 2,
  },
  shade: {
    flex: 1,
    backgroundColor: colors.border,
  },
  highlight: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
