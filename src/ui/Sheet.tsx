import { ReactNode, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bottom sheet for menus and pickers.
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title?: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.grabber} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </View>
    </Modal>
  );
}

export function SheetButton({ label, onPress, tone = 'default' }: { label: string; onPress: () => void; tone?: 'default' | 'danger' | 'selected' }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, tone === 'selected' && styles.buttonSelected, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <Text style={[styles.buttonText, tone === 'danger' && styles.danger, tone === 'selected' && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

// Asks for a name (new playbook, rename…). Works the same on iOS and Android.
export function NameDialog({
  visible,
  title,
  initial = '',
  confirmLabel = 'Save',
  placeholder = 'Name',
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  initial?: string;
  confirmLabel?: string;
  placeholder?: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  return (
    <Sheet visible={visible} title={title} onClose={onCancel}>
      {/* Remounted each time it opens, so the field starts from `initial`. */}
      {visible && <NameField initial={initial} confirmLabel={confirmLabel} placeholder={placeholder} onCancel={onCancel} onSubmit={onSubmit} />}
    </Sheet>
  );
}

function NameField({
  initial,
  confirmLabel,
  placeholder,
  onCancel,
  onSubmit,
}: {
  initial: string;
  confirmLabel: string;
  placeholder: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const submit = () => {
    if (value.trim()) onSubmit(value.trim());
  };
  return (
    <>
      <TextInput value={value} onChangeText={setValue} onSubmitEditing={submit} autoFocus style={styles.input} placeholder={placeholder} returnKeyType="done" />
      <View style={styles.row}>
        <Pressable onPress={onCancel} style={[styles.action, styles.actionGhost]}>
          <Text style={styles.actionGhostText}>Cancel</Text>
        </Pressable>
        <Pressable onPress={submit} style={[styles.action, !value.trim() && { opacity: 0.4 }]}>
          <Text style={styles.actionText}>{confirmLabel}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#d1d5db', marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 4 },
  button: { paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10 },
  buttonSelected: { backgroundColor: '#f1f5f9' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  selectedText: { color: '#1d4ed8' },
  danger: { color: '#b91c1c' },
  input: { fontSize: 17, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  action: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#111827' },
  actionText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  actionGhost: { backgroundColor: '#f1f5f9' },
  actionGhostText: { color: '#111827', fontWeight: '700', fontSize: 16 },
});
