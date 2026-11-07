import { Pressable, StyleSheet, Text, View } from 'react-native';

// Section switcher shown under a screen title.
export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.item, on && styles.itemOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[styles.text, on && styles.textOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', padding: 3, borderRadius: 10, backgroundColor: '#d9dde4' },
  item: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  itemOn: { backgroundColor: '#ffffff' },
  text: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  textOn: { color: '#111827', fontWeight: '800' },
});
