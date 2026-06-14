import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
      {loading ? <ActivityIndicator color={tone === 'primary' || tone === 'danger' ? '#fff' : palette.ink} size="small" /> : <Text style={[styles.buttonText, (tone === 'primary' || tone === 'danger') && styles.buttonTextPrimary]}>{children}</Text>}
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
      <Pressable disabled={loading} onPress={onValueChange} style={[webPressableReset, styles.toggleTrack, value && styles.toggleTrackOn, loading && styles.toggleTrackLoading]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]}>
          {loading ? <ActivityIndicator color={palette.muted} size="small" /> : null}
        </View>
      </Pressable>
    </Card>
  );
}

export function Toast({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={[styles.toast, styles.toastNoPointer]}>
      <View style={styles.toastIconDot} />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

export function BottomSheet({
  children,
  contentStyle,
  dismissDisabled,
  onClose,
  visible,
}: {
  children: ReactNode;
  contentStyle?: object;
  dismissDisabled?: boolean;
  onClose: () => void;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!dismissDisabled) onClose();
      }}
      transparent
      visible={visible}
    >
      <View style={styles.bottomSheetBackdrop}>
        <Pressable disabled={dismissDisabled} onPress={onClose} style={styles.bottomSheetBackdropTouch} />
        <View style={[styles.bottomSheetPanel, contentStyle]}>
          <View style={styles.bottomSheetHandle} />
          {children}
        </View>
      </View>
    </Modal>
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
  bottomSheetBackdrop: { backgroundColor: 'rgba(20,18,14,0.48)', flex: 1, justifyContent: 'flex-end' },
  bottomSheetBackdropTouch: { flex: 1 },
  bottomSheetHandle: { alignSelf: 'center', backgroundColor: '#E5E0D5', borderRadius: 2, height: 4, marginBottom: 10, width: 40 },
  bottomSheetPanel: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 14, paddingBottom: 32, paddingHorizontal: 22, paddingTop: 16, shadowColor: '#50371e', shadowOffset: { height: -24, width: 0 }, shadowOpacity: 0.28, shadowRadius: 50 },
  body: { color: palette.muted, fontFamily, fontSize: 14, lineHeight: 20 },
  button: { alignItems: 'center', borderRadius: 14, justifyContent: 'center', minHeight: 44, paddingHorizontal: 18, paddingVertical: 11, shadowColor: '#ff8a5c', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.12, shadowRadius: 16 },
  button_danger: { backgroundColor: palette.danger },
  button_ghost: { backgroundColor: 'transparent', borderColor: palette.border, borderWidth: 1 },
  button_primary: { backgroundColor: palette.orange },
  button_secondary: { backgroundColor: '#FFF1E5' },
  buttonDisabled: { backgroundColor: palette.pale, opacity: 1 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonText: { color: palette.ink, fontFamily, fontSize: 14, fontWeight: '600' },
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
  input: { backgroundColor: '#fff', borderColor: palette.border, borderRadius: 12, borderWidth: 1.5, color: palette.ink, fontFamily, fontSize: 14, minHeight: 46, paddingHorizontal: 14 },
  inputFocused: { borderColor: palette.orange, shadowColor: palette.orange, shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.18, shadowRadius: 10 },
  label: { color: palette.muted, fontFamily, fontSize: 12.5, fontWeight: '500' },
  modal: { backgroundColor: palette.card, borderRadius: 20, gap: 14, margin: 32, maxWidth: 290, paddingHorizontal: 18, paddingBottom: 16, paddingTop: 20, shadowColor: '#50371e', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.12, shadowRadius: 30, width: 290 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(20,18,14,0.50)', flex: 1, justifyContent: 'center' },
  pill: { alignSelf: 'flex-start', borderRadius: 8, fontFamily, fontSize: 11, fontWeight: '600', height: 22, lineHeight: 14, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4 },
  pill_danger: { backgroundColor: '#ffdad6', color: palette.danger },
  pill_neutral: { backgroundColor: palette.pale, color: palette.muted },
  pill_success: { backgroundColor: '#dff5f2', color: '#006a63' },
  row: { flexDirection: 'row', gap: 10 },
  sectionTitle: { gap: 8, marginBottom: 18 },
  subtitle: { color: palette.muted, fontFamily, fontSize: 15, lineHeight: 22 },
  toast: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(27,28,25,0.92)', borderRadius: 22, flexDirection: 'row', gap: 10, maxWidth: '92%', minHeight: 46, minWidth: 180, paddingHorizontal: 18, paddingVertical: 12, position: 'absolute', shadowColor: '#000', shadowOffset: { height: 18, width: 0 }, shadowOpacity: 0.28, shadowRadius: 38, top: 96, zIndex: 20 },
  toastIconDot: { backgroundColor: palette.teal, borderRadius: 12, height: 24, width: 24 },
  toastNoPointer: { pointerEvents: 'none' },
  toastText: { color: '#fff', flexShrink: 1, fontFamily, fontSize: 13, fontWeight: '600' },
  toggleThumb: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 11, height: 22, justifyContent: 'center', shadowColor: '#000', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.15, shadowRadius: 4, width: 22 },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  toggleText: { flex: 1, gap: 4 },
  toggleTrack: { backgroundColor: '#D9D5CB', borderRadius: 13, height: 26, justifyContent: 'center', padding: 2, width: 44 },
  toggleTrackLoading: { opacity: 0.8 },
  toggleTrackOn: { backgroundColor: palette.teal },
});
