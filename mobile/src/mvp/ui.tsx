import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

export const palette = {
  background: '#FBF7F1',
  border: '#ECE7DE',
  card: '#FFFFFF',
  danger: '#E5573F',
  ink: '#1B1C19',
  muted: '#7A7972',
  orange: '#ff8a5c',
  orangeSoft: '#fff0e8',
  pale: '#EFEAE1',
  sand: '#f2dfd3',
  teal: '#4db6ac',
  tealSoft: '#e1f7f4',
};

const fontFamily = Platform.OS === 'web' ? 'Microsoft YaHei, PingFang SC, Arial, sans-serif' : undefined;
const webPressableReset =
  Platform.OS === 'web'
    ? ({ outlineColor: 'transparent', outlineStyle: 'none', outlineWidth: 0, userSelect: 'none' } as unknown as ViewStyle)
    : null;
const webTextInputReset =
  Platform.OS === 'web'
    ? ({ outlineColor: 'transparent', outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle)
    : null;

export function Button({
  children,
  disabled,
  loading,
  onPress,
  tone = 'primary',
}: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  tone?: 'danger' | 'ghost' | 'primary' | 'secondary';
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [webPressableReset, styles.button, styles[`button_${tone}`], pressed && !disabled && !loading && styles.buttonPressed, (disabled || loading) && styles.buttonDisabled]}
    >
      {loading ? <ActivityIndicator color={tone === 'primary' ? '#fff' : palette.ink} size="small" /> : <Text style={[styles.buttonText, tone === 'primary' && styles.buttonTextPrimary]}>{children}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({
  label,
  onChangeText,
  placeholder,
  value,
  keyboardType,
}: {
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad' | 'phone-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor="#b0a69c"
        style={[styles.input, focused && styles.inputFocused, webTextInputReset]}
        value={value}
      />
    </View>
  );
}

export function SectionTitle({ subtitle, title }: { subtitle?: string; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.h1}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'danger' | 'neutral' | 'success' }) {
  return <Text style={[styles.pill, styles[`pill_${tone}`]]}>{children}</Text>;
}

export function ToggleRow({
  description,
  label,
  loading,
  onValueChange,
  value,
}: {
  description: string;
  label: string;
  loading?: boolean;
  onValueChange: () => void;
  value: boolean;
}) {
  return (
    <Card style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.body}>{description}</Text>
      </View>
      {loading ? <ActivityIndicator color={palette.teal} /> : <Switch onValueChange={onValueChange} thumbColor="#fff" trackColor={{ false: '#e4e2dd', true: palette.teal }} value={value} />}
    </Card>
  );
}

export function Toast({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={[styles.toast, styles.toastNoPointer]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

export function ConfirmDialog({
  body,
  confirmText = '确认',
  onCancel,
  onConfirm,
  title,
  visible,
}: {
  body: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.row}>
            <Button onPress={onCancel} tone="ghost">取消</Button>
            <Button onPress={onConfirm} tone="danger">{confirmText}</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  body: { color: palette.muted, fontFamily, fontSize: 14, lineHeight: 20 },
  button: { alignItems: 'center', borderRadius: 26, justifyContent: 'center', minHeight: 52, paddingHorizontal: 20, paddingVertical: 13 },
  button_danger: { backgroundColor: '#ffe4df' },
  button_ghost: { backgroundColor: '#fffaf5', borderColor: 'rgba(234,223,210,0.9)', borderWidth: 1 },
  button_primary: { backgroundColor: palette.orange },
  button_secondary: { backgroundColor: palette.tealSoft },
  buttonDisabled: { backgroundColor: '#efd6c9', opacity: 0.72 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonText: { color: palette.ink, fontFamily, fontSize: 16, fontWeight: '500' },
  buttonTextPrimary: { color: '#fff' },
  card: {
    backgroundColor: palette.card,
    borderColor: 'rgba(234,223,210,0.78)',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#8b5e3c',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  cardTitle: { color: palette.ink, fontFamily, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  fieldWrap: { gap: 8 },
  h1: { color: palette.ink, fontFamily, fontSize: 28, fontWeight: '600', letterSpacing: 0, lineHeight: 34 },
  input: { backgroundColor: '#fffdf9', borderColor: 'rgba(234,223,210,0.95)', borderRadius: 18, borderWidth: 1.2, color: palette.ink, fontFamily, fontSize: 16, minHeight: 54, paddingHorizontal: 16 },
  inputFocused: { borderColor: palette.orange, shadowColor: palette.orange, shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.22, shadowRadius: 10 },
  label: { color: palette.muted, fontFamily, fontSize: 12.5, fontWeight: '500' },
  modal: { backgroundColor: palette.card, borderRadius: 24, gap: 14, margin: 24, padding: 18 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.34)', flex: 1, justifyContent: 'center' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, fontFamily, fontSize: 12, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  pill_danger: { backgroundColor: '#ffdad6', color: palette.danger },
  pill_neutral: { backgroundColor: palette.pale, color: palette.muted },
  pill_success: { backgroundColor: '#dff5f2', color: '#006a63' },
  row: { flexDirection: 'row', gap: 10 },
  sectionTitle: { gap: 8, marginBottom: 18 },
  subtitle: { color: palette.muted, fontFamily, fontSize: 15, lineHeight: 22 },
  toast: { alignSelf: 'center', backgroundColor: '#30312e', borderRadius: 999, maxWidth: '92%', paddingHorizontal: 18, paddingVertical: 12, position: 'absolute', top: 110, zIndex: 10 },
  toastNoPointer: { pointerEvents: 'none' },
  toastText: { color: '#fff', fontFamily, fontSize: 14, fontWeight: '600' },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  toggleText: { flex: 1, gap: 4 },
});
