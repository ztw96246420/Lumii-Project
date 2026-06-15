import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { AlertTriangle, Check, Info, X } from 'lucide-react-native';

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
  warning: '#C99B3E',
  warningSoft: '#FBF2D9',
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
const webSkeletonGradient =
  Platform.OS === 'web'
    ? ({
        backgroundImage: 'linear-gradient(90deg, #F0EBE0 0%, #E5E0D5 50%, #F0EBE0 100%)',
        backgroundSize: '200% 100%',
      } as unknown as ViewStyle)
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
  const isDisabled = disabled || loading;
  const isSolid = tone === 'primary' || tone === 'danger';
  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [webPressableReset, styles.button, styles[`button_${tone}`], pressed && !isDisabled && styles.buttonPressed, isDisabled && styles.buttonDisabled]}
    >
      {loading ? <ActivityIndicator color={isSolid ? '#fff' : palette.ink} size="small" /> : null}
      <Text style={[styles.buttonText, isSolid && styles.buttonTextPrimary, isDisabled && !loading && styles.buttonTextDisabled]}>
        {loading ? '处理中…' : children}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  variant = 'default',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'message' | 'pet' | 'place';
}) {
  const variantStyle =
    variant === 'pet'
      ? styles.card_pet
      : variant === 'place'
        ? styles.card_place
        : variant === 'message'
          ? styles.card_message
          : null;
  return <View style={[styles.card, variantStyle, style]}>{children}</View>;
}

export function Field({
  disabled,
  error,
  label,
  onChangeText,
  placeholder,
  value,
  keyboardType,
}: {
  disabled?: boolean;
  error?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad' | 'phone-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const [focused, setFocused] = useState(false);
  const showFilled = Boolean(value) && !focused && !error && !disabled;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, focused && styles.inputFocused, error && styles.inputError, disabled && styles.inputDisabled]}>
        <TextInput
          editable={!disabled}
          keyboardType={keyboardType}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          placeholderTextColor="#B8B3A8"
          style={[styles.inputText, disabled && styles.inputTextDisabled, webTextInputReset]}
          value={value}
        />
        {error ? <AlertTriangle color={palette.danger} size={14} strokeWidth={2.4} /> : null}
        {showFilled ? <Check color={palette.teal} size={14} strokeWidth={2.4} /> : null}
      </View>
      {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
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

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'danger' | 'distance' | 'neutral' | 'selected' | 'status' | 'success' | 'warning' }) {
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

export function Toast({
  actionText,
  message,
  subtitle,
  tone = 'info',
  variant = 'surface',
}: {
  actionText?: string;
  message?: string;
  subtitle?: string;
  tone?: 'error' | 'info' | 'success' | 'warning';
  variant?: 'dark' | 'surface';
}) {
  if (!message) return null;
  const dark = variant === 'dark';
  const Icon = toastIconByTone[tone];
  return (
    <View style={[styles.toast, dark ? styles.toastDark : styles.toastSurface, styles.toastNoPointer]}>
      <View style={[styles.toastIcon, dark ? styles.toastIconDark : styles[`toastIcon_${tone}`]]}>
        {dark ? <Icon color="#fff" size={15} strokeWidth={3} /> : <Icon color={toastIconColorByTone[tone]} size={14} strokeWidth={2.5} />}
      </View>
      <View style={styles.toastTextWrap}>
        <Text style={[styles.toastText, dark ? styles.toastTextDark : styles.toastTextSurface]} numberOfLines={2}>{message}</Text>
        {subtitle ? <Text style={[styles.toastSubtitle, dark ? styles.toastSubtitleDark : styles.toastSubtitleSurface]} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {actionText ? <Text style={dark ? styles.toastActionDark : styles.toastActionSurface}>{actionText}</Text> : null}
    </View>
  );
}

export function EmptyState({
  action,
  description,
  icon,
  onAction,
  title,
}: {
  action?: string;
  description: string;
  icon: ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.emptyBlock}>
      <View style={styles.emptyIconBox}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action ? (
        <Pressable disabled={!onAction} onPress={onAction} style={[webPressableReset, styles.emptyAction]}>
          <Text style={styles.emptyActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorState({
  action,
  description,
  icon,
  iconTone = 'neutral',
  onAction,
  title,
}: {
  action: string;
  description: string;
  icon: ReactNode;
  iconTone?: 'danger' | 'neutral' | 'primary' | 'warning';
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.errorBlock}>
      <View style={[styles.errorIconBox, styles[`errorIconBox_${iconTone}`]]}>{icon}</View>
      <View style={styles.errorTextWrap}>
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.errorDescription}>{description}</Text>
      </View>
      <Pressable disabled={!onAction} onPress={onAction} style={[webPressableReset, styles.errorAction]}>
        <Text style={styles.errorActionText}>{action}</Text>
      </Pressable>
    </View>
  );
}

export function LoadingState({ message = '正在为你召唤灵伴…' }: { message?: string }) {
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator color={palette.orange} size={32} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

export function SkeletonLine({
  borderRadius,
  height = 12,
  style,
  width,
}: {
  borderRadius?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  width: ViewStyle['width'];
}) {
  return <View style={[styles.skeletonLine, webSkeletonGradient, { borderRadius, height, width }, style]} />;
}

export function SkeletonCard() {
  return (
    <Card style={styles.skeletonCard}>
      <View style={styles.skeletonCardHeader}>
        <View style={[styles.skeletonAvatar, webSkeletonGradient]} />
        <View style={styles.skeletonTextStack}>
          <SkeletonLine height={14} width="60%" />
          <SkeletonLine height={10} width="40%" />
        </View>
      </View>
      <SkeletonLine height={12} width="100%" />
      <SkeletonLine height={12} width="85%" />
      <SkeletonLine height={12} width="70%" />
    </Card>
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
  const dangerous = /删|删除|移除|退出|注销/.test(confirmText);
  const Icon = dangerous ? AlertTriangle : Info;
  const iconColor = dangerous ? palette.danger : palette.orange;
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <View style={[styles.modalIconBox, dangerous ? styles.modalIconDanger : styles.modalIconPrimary]}>
            <Icon color={iconColor} size={22} strokeWidth={2.4} />
          </View>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalBody}>{body}</Text>
          <View style={styles.modalActions}>
            <Button onPress={onCancel} tone="ghost">取消</Button>
            <Button onPress={onConfirm} tone={dangerous ? 'danger' : 'primary'}>{confirmText}</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const toastIconByTone = {
  error: X,
  info: Info,
  success: Check,
  warning: AlertTriangle,
};

const toastIconColorByTone = {
  error: palette.danger,
  info: palette.ink,
  success: palette.teal,
  warning: palette.warning,
};

export const styles = StyleSheet.create({
  bottomSheetBackdrop: { backgroundColor: 'rgba(20,18,14,0.48)', flex: 1, justifyContent: 'flex-end' },
  bottomSheetBackdropTouch: { flex: 1 },
  bottomSheetHandle: { alignSelf: 'center', backgroundColor: '#E5E0D5', borderRadius: 2, height: 4, marginBottom: 14, width: 40 },
  bottomSheetPanel: { backgroundColor: '#fff', borderColor: 'rgba(80,55,30,0.06)', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, gap: 14, paddingBottom: 32, paddingHorizontal: 22, paddingTop: 16, shadowColor: '#50371e', shadowOffset: { height: -24, width: 0 }, shadowOpacity: 0.2, shadowRadius: 50 },
  body: { color: palette.muted, fontFamily, fontSize: 14, lineHeight: 20 },
  button: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', gap: 6, height: 44, justifyContent: 'center', paddingHorizontal: 18 },
  button_danger: { backgroundColor: palette.danger },
  button_ghost: { backgroundColor: 'transparent', borderColor: palette.border, borderWidth: 1 },
  button_primary: { backgroundColor: palette.orange },
  button_secondary: { backgroundColor: '#FFF1E5' },
  buttonDisabled: { backgroundColor: palette.pale, opacity: 1 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonText: { color: palette.ink, fontFamily, fontSize: 14, fontWeight: '600' },
  buttonTextDisabled: { color: '#B8B3A8' },
  buttonTextPrimary: { color: '#fff' },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  card_message: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', gap: 12, padding: 12 },
  card_pet: {
    alignItems: 'center',
    backgroundColor: '#FFE8D8',
    borderColor: 'rgba(255,138,92,0.18)',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 100%)' } as object) : null),
  },
  card_place: { borderRadius: 16, flexDirection: 'row', gap: 12, padding: 12 },
  cardTitle: { color: palette.ink, fontFamily, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  emptyAction: { alignSelf: 'center', backgroundColor: palette.orange, borderRadius: 12, marginTop: 4, paddingHorizontal: 18, paddingVertical: 8 },
  emptyActionText: { color: '#fff', fontFamily, fontSize: 13, fontWeight: '600' },
  emptyBlock: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, gap: 8, paddingHorizontal: 16, paddingVertical: 20 },
  emptyDescription: { color: palette.muted, fontFamily, fontSize: 12, lineHeight: 19, textAlign: 'center' },
  emptyIconBox: { alignItems: 'center', backgroundColor: '#F4EFE6', borderRadius: 18, height: 56, justifyContent: 'center', marginBottom: 2, width: 56 },
  emptyTitle: { color: palette.ink, fontFamily, fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  errorAction: { borderColor: palette.orange, borderRadius: 10, borderWidth: 1, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 5 },
  errorActionText: { color: palette.orange, fontFamily, fontSize: 12, fontWeight: '600' },
  errorBlock: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  errorDescription: { color: palette.muted, fontFamily, fontSize: 12, lineHeight: 18, marginTop: 4 },
  errorIconBox: { alignItems: 'center', borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  errorIconBox_danger: { backgroundColor: '#FBE4DE' },
  errorIconBox_neutral: { backgroundColor: palette.pale },
  errorIconBox_primary: { backgroundColor: '#FFE6D6' },
  errorIconBox_warning: { backgroundColor: palette.warningSoft },
  errorTextWrap: { flex: 1 },
  errorTitle: { color: palette.ink, fontFamily, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  fieldWrap: { gap: 8 },
  h1: { color: palette.ink, fontFamily, fontSize: 28, fontWeight: '600', letterSpacing: 0, lineHeight: 34 },
  inputDisabled: { backgroundColor: '#F4EFE6' },
  inputError: { borderColor: palette.danger },
  inputErrorText: { color: palette.danger, fontFamily, fontSize: 11, lineHeight: 15, marginTop: 4 },
  inputFocused: { borderColor: palette.orange, shadowColor: palette.orange, shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.18, shadowRadius: 10 },
  inputShell: { alignItems: 'center', backgroundColor: '#fff', borderColor: palette.border, borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', gap: 8, height: 46, paddingHorizontal: 14 },
  inputText: { color: palette.ink, flex: 1, fontFamily, fontSize: 14, height: 44, padding: 0 },
  inputTextDisabled: { color: '#B8B3A8' },
  label: { color: palette.muted, fontFamily, fontSize: 12.5, fontWeight: '500' },
  loadingBlock: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  loadingText: { color: palette.muted, fontFamily, fontSize: 12, fontWeight: '400', lineHeight: 17 },
  modal: { alignItems: 'center', backgroundColor: palette.card, borderRadius: 20, gap: 0, margin: 32, maxWidth: 290, paddingBottom: 16, paddingHorizontal: 18, paddingTop: 20, shadowColor: '#50371e', shadowOffset: { height: 14, width: 0 }, shadowOpacity: 0.12, shadowRadius: 30, width: 290 },
  modalActions: { alignSelf: 'stretch', flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 16 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(20,18,14,0.50)', flex: 1, justifyContent: 'center' },
  modalBody: { color: palette.muted, fontFamily, fontSize: 12, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  modalIconBox: { alignItems: 'center', borderRadius: 14, height: 48, justifyContent: 'center', marginBottom: 12, width: 48 },
  modalIconDanger: { backgroundColor: '#FBE4DE' },
  modalIconPrimary: { backgroundColor: '#FFE6D6' },
  modalTitle: { color: palette.ink, fontFamily, fontSize: 16, fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  pill: { alignSelf: 'flex-start', borderRadius: 8, fontFamily, fontSize: 11, fontWeight: '500', height: 22, lineHeight: 14, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4 },
  pill_danger: { backgroundColor: '#ffdad6', color: palette.danger },
  pill_distance: { backgroundColor: palette.pale, color: palette.ink },
  pill_neutral: { backgroundColor: palette.pale, color: palette.muted },
  pill_selected: { backgroundColor: palette.orange, color: '#fff' },
  pill_status: { backgroundColor: palette.warningSoft, color: palette.warning },
  pill_success: { backgroundColor: '#dff5f2', color: '#006a63' },
  pill_warning: { backgroundColor: palette.warningSoft, color: palette.warning },
  row: { flexDirection: 'row', gap: 10 },
  sectionTitle: { gap: 8, marginBottom: 18 },
  skeletonAvatar: { backgroundColor: '#F0EBE0', borderRadius: 26, flexShrink: 0, height: 52, width: 52 },
  skeletonCard: { gap: 12 },
  skeletonCardHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 4 },
  skeletonLine: { backgroundColor: '#F0EBE0', borderRadius: 6 },
  skeletonTextStack: { flex: 1, gap: 8 },
  subtitle: { color: palette.muted, fontFamily, fontSize: 15, lineHeight: 22 },
  toast: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 10, maxWidth: 340, minHeight: 46, minWidth: 180, paddingHorizontal: 12, paddingVertical: 10, position: 'absolute', top: 70, zIndex: 20 },
  toastActionDark: { color: '#FFB48C', fontFamily, fontSize: 12, fontWeight: '600' },
  toastActionSurface: { borderLeftColor: palette.border, borderLeftWidth: 1, color: palette.orange, fontFamily, fontSize: 12.5, fontWeight: '600', marginLeft: 4, paddingLeft: 8 },
  toastDark: { backgroundColor: 'rgba(27,28,25,0.92)', borderRadius: 22, paddingRight: 18, shadowColor: '#000', shadowOffset: { height: 18, width: 0 }, shadowOpacity: 0.28, shadowRadius: 38 },
  toastIcon: { alignItems: 'center', height: 24, justifyContent: 'center', width: 24 },
  toastIconDark: { backgroundColor: palette.teal, borderRadius: 12 },
  toastIcon_error: { backgroundColor: '#FBE4DE', borderRadius: 8 },
  toastIcon_info: { backgroundColor: palette.pale, borderRadius: 8 },
  toastIcon_success: { backgroundColor: '#E8F5F3', borderRadius: 8 },
  toastIcon_warning: { backgroundColor: palette.warningSoft, borderRadius: 8 },
  toastIconMark: { borderRadius: 5, height: 10, width: 10 },
  toastIconMarkDark: { backgroundColor: '#fff', borderRadius: 5, height: 10, width: 10 },
  toastIconMark_error: { backgroundColor: palette.danger },
  toastIconMark_info: { backgroundColor: palette.ink },
  toastIconMark_success: { backgroundColor: palette.teal },
  toastIconMark_warning: { backgroundColor: palette.warning },
  toastNoPointer: { pointerEvents: 'none' },
  toastSurface: { backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.04)', borderRadius: 14, borderWidth: 1, shadowColor: '#50371e', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.18, shadowRadius: 28 },
  toastSubtitle: { fontFamily, fontSize: 11.5, fontWeight: '500', lineHeight: 16, marginTop: 2 },
  toastSubtitleDark: { color: 'rgba(255,255,255,0.76)' },
  toastSubtitleSurface: { color: palette.muted },
  toastText: { fontFamily, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  toastTextDark: { color: '#fff' },
  toastTextSurface: { color: palette.ink },
  toastTextWrap: { flex: 1, flexShrink: 1 },
  toggleThumb: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 11, height: 22, justifyContent: 'center', shadowColor: '#000', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.15, shadowRadius: 4, width: 22 },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  toggleText: { flex: 1, gap: 4 },
  toggleTrack: { backgroundColor: '#D9D5CB', borderRadius: 13, height: 26, justifyContent: 'center', padding: 2, width: 44 },
  toggleTrackLoading: { opacity: 0.8 },
  toggleTrackOn: { backgroundColor: palette.teal },
});
