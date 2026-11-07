import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  count: number;
  index: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  // False once the play ends with a shot (the button still explains why).
  canAdd: boolean;
  onDelete: () => void;
};

export function SceneBar({ count, index, onSelect, onAdd, canAdd, onDelete }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scenes}>
        {Array.from({ length: count }, (_, i) => {
          const selected = i === index;
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              style={[styles.scene, selected && styles.sceneOn]}
              accessibilityRole="button"
              accessibilityLabel={`Scene ${i + 1}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.sceneText, selected && styles.sceneTextOn]}>{i + 1}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={onAdd} style={[styles.scene, styles.add, !canAdd && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="Add scene">
          <Text style={styles.addText}>+</Text>
        </Pressable>
      </ScrollView>
      {count > 1 && (
        <Pressable onPress={onDelete} style={styles.delete} accessibilityRole="button">
          <Text style={styles.deleteText}>Delete scene</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scenes: { gap: 6, alignItems: 'center' },
  scene: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  sceneOn: { backgroundColor: '#111827', borderColor: '#111827' },
  sceneText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  sceneTextOn: { color: '#ffffff' },
  add: { borderStyle: 'dashed', backgroundColor: 'transparent', borderColor: '#9ca3af' },
  addText: { fontSize: 20, fontWeight: '500', color: '#6b7280', marginTop: -2 },
  delete: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 6 },
  deleteText: { fontSize: 13, fontWeight: '600', color: '#b91c1c' },
});
