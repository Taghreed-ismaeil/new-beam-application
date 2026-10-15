import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { router, type Href } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";

import { SIDEBAR_BREAKPOINT } from "@/components/admin/nav";
import { imageUrl } from "@/lib/api-client";
import { uploadImage } from "@/lib/admin-api";
import { useDirection, useI18n } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Design tokens — derived from the Beem logo: deep brand green (#005751) as the
// primary colour, white, and the logo's small orange mark as a sparing accent
// (attention states, badges) rather than the colour of every control.
// ---------------------------------------------------------------------------

export const C = {
  // brand
  teal: "#005751",
  tealDeep: "#003D39",
  lightTeal: "#E7F1EF",
  orange: "#F2541B",
  lightOrange: "#FEEEE7",

  // neutrals (slightly green-tinted so greys sit well next to the brand green)
  dark: "#15211F",
  text: "#2A3533",
  muted: "#6B7774",
  subtle: "#98A29F",
  placeholder: "#A9B2AF",
  border: "#E6EBE9",
  borderStrong: "#D6DDDA",
  bg: "#F5F7F6",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F4F3",
  white: "#FFFFFF",

  // status
  danger: "#D6423C",
  lightDanger: "#FCEBEA",
};

/** Type scale — one place to keep every screen's hierarchy consistent. */
export const T = StyleSheet.create({
  display: { fontSize: fs(34), fontWeight: "800", letterSpacing: -0.6, color: C.dark },
  h1: { fontSize: fs(27), fontWeight: "800", letterSpacing: -0.4, color: C.dark },
  h2: { fontSize: fs(20), fontWeight: "700", letterSpacing: -0.2, color: C.dark },
  title: { fontSize: fs(17.5), fontWeight: "700", color: C.dark },
  body: { fontSize: fs(16.5), fontWeight: "500", color: C.text, lineHeight: fs(24) },
  caption: { fontSize: fs(15), fontWeight: "500", color: C.muted, lineHeight: fs(21) },
  label: { fontSize: fs(14.5), fontWeight: "700", color: C.muted },
  micro: { fontSize: fs(13.5), fontWeight: "700", color: C.subtle, letterSpacing: 0.3 },
});

export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24 };

/** Soft, low-contrast elevation — cards read as layered paper, not floating tiles. */
export const SHADOW: ViewStyle = Platform.select<ViewStyle>({
  web: { boxShadow: "0 1px 2px rgba(21,33,31,0.04), 0 4px 16px rgba(21,33,31,0.05)" } as ViewStyle,
  default: {
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
})!;

/** Extra bottom padding for scroll views on screens without their own fixed
 * button bar, so the last row clears the device's home indicator / gesture
 * area comfortably. */
export const BOTTOM_SPACE = 48;

// ---------------------------------------------------------------------------
// Card — the standard white surface every screen groups its content in
// ---------------------------------------------------------------------------

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return <View style={[cardStyles.card, padded && cardStyles.padded, style]}>{children}</View>;
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    ...SHADOW,
  },
  padded: { padding: 18 },
});

// ---------------------------------------------------------------------------
// AdminHeader
// ---------------------------------------------------------------------------

type AdminHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  extra?: React.ReactNode;
};

export function AdminHeader({ eyebrow, title, subtitle, showBack = true, right, extra }: AdminHeaderProps) {
  const dir = useDirection();
  // with the desktop sidebar every section is already one click away, so "back" is just noise
  const { width } = useWindowDimensions();
  if (width >= SIDEBAR_BREAKPOINT) showBack = false;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/admin" as Href);
  }

  return (
    <View style={headerStyles.wrap}>
      <View style={[headerStyles.topRow, dir.row]}>
        {showBack ? (
          <Pressable
            onPress={goBack}
            hitSlop={10}
            style={({ pressed }) => [headerStyles.backBtn, pressed && { backgroundColor: C.surfaceAlt }]}
          >
            <Ionicons name={dir.back} size={19} color={C.dark} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {right}
      </View>

      {!!eyebrow && <Text style={[headerStyles.eyebrow, dir.text]}>{eyebrow}</Text>}
      <Text style={[T.h1, dir.text]}>{title}</Text>
      {!!subtitle && (
        <Text style={[T.caption, headerStyles.subtitle, dir.text]} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
      {!!extra && <View style={headerStyles.extra}>{extra}</View>}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 },
  topRow: { alignItems: "center", minHeight: 40, marginBottom: 10 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: C.orange, fontSize: fs(14.5), fontWeight: "700", marginBottom: 4 },
  subtitle: { marginTop: 4 },
  extra: { marginTop: 14 },
});

// ---------------------------------------------------------------------------
// SectionTitle — small heading above a group of cards
// ---------------------------------------------------------------------------

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  const dir = useDirection();
  return (
    <View style={[sectionStyles.row, dir.row]}>
      <Text style={[T.label, sectionStyles.text, dir.text]}>{title}</Text>
      {right}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: { alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 10 },
  text: { flex: 1, color: C.muted },
});

// ---------------------------------------------------------------------------
// Banner — inline notice (error by default, or info/success)
// ---------------------------------------------------------------------------

export type BannerValue = { text: string; tone?: "error" | "info" | "success" } | null | undefined;

const BANNER_TONE = {
  error: { bg: C.lightDanger, fg: C.danger, icon: "alert-circle" as const },
  info: { bg: C.lightTeal, fg: C.teal, icon: "information-circle" as const },
  success: { bg: C.lightTeal, fg: C.teal, icon: "checkmark-circle" as const },
};

export function Banner({ value }: { value: BannerValue }) {
  const dir = useDirection();
  if (!value?.text) return null;
  const tone = BANNER_TONE[value.tone ?? "error"];
  return (
    <View style={[bannerStyles.wrap, dir.row, { backgroundColor: tone.bg }]}>
      <Ionicons name={tone.icon} size={18} color={tone.fg} />
      <Text style={[bannerStyles.text, dir.text, { color: tone.fg }]}>{value.text}</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 10,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  text: { flex: 1, fontSize: fs(15.5), fontWeight: "600", lineHeight: fs(22) },
});

// ---------------------------------------------------------------------------
// Btn
// ---------------------------------------------------------------------------

type BtnVariant = "primary" | "accent" | "ghost" | "outline" | "danger";

type BtnProps = {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  size?: "md" | "sm";
};

export function Btn({ title, onPress, variant = "primary", icon, loading, disabled, size = "md" }: BtnProps) {
  const dir = useDirection();
  const isDisabled = disabled || loading;
  const palette = BTN_PALETTE[variant];

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        btnStyles.base,
        size === "sm" && btnStyles.sm,
        dir.row,
        { backgroundColor: palette.bg, borderColor: palette.border ?? palette.bg },
        isDisabled && btnStyles.disabled,
        pressed && !isDisabled && { backgroundColor: palette.pressed },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {!!icon && <Ionicons name={icon} size={size === "sm" ? 16 : 18} color={palette.fg} />}
          <Text style={[btnStyles.text, size === "sm" && btnStyles.textSm, { color: palette.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const BTN_PALETTE: Record<BtnVariant, { bg: string; fg: string; pressed: string; border?: string }> = {
  primary: { bg: C.teal, fg: C.white, pressed: C.tealDeep },
  accent: { bg: C.orange, fg: C.white, pressed: "#D9460F" },
  ghost: { bg: C.surfaceAlt, fg: C.dark, pressed: "#E6EBE9" },
  outline: { bg: C.surface, fg: C.dark, pressed: C.surfaceAlt, border: C.borderStrong },
  danger: { bg: C.danger, fg: C.white, pressed: "#B93631" },
};

const btnStyles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  sm: { minHeight: 40, paddingHorizontal: 14, borderRadius: RADIUS.sm + 2 },
  text: { fontSize: fs(17), fontWeight: "700" },
  textSm: { fontSize: fs(15.5) },
  disabled: { opacity: 0.45 },
});

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

export type ConfirmValue = {
  title: string;
  text?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
} | null;

export function ConfirmDialog({ value, onCancel }: { value: ConfirmValue; onCancel: () => void }) {
  const { t } = useI18n();
  const dir = useDirection();

  if (!value) return null;

  // Dismiss first, then run the action: closing the sheet underneath while this Modal is still
  // up can leave the sheet stuck open on iOS (two stacked Modals dismissing at once).
  async function confirm() {
    const action = value!.onConfirm;
    onCancel();
    await action();
  }

  // Its own Modal so it stacks above an open edit sheet (itself a Modal) instead of behind it.
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
    <View style={confirmStyles.backdrop}>
      <View style={confirmStyles.dialog}>
        <View style={confirmStyles.icon}>
          <Ionicons name="alert-circle-outline" size={24} color={C.danger} />
        </View>
        <Text style={[T.h2, dir.text, { marginBottom: 6 }]}>{value.title}</Text>
        {!!value.text && <Text style={[T.caption, dir.text, { marginBottom: 16 }]}>{value.text}</Text>}
        <View style={{ gap: 10, marginTop: 4 }}>
          <Btn title={value.confirmLabel ?? t("delete")} variant="danger" onPress={confirm} />
          <Btn title={value.cancelLabel ?? t("cancel")} variant="ghost" onPress={onCancel} />
        </View>
      </View>
    </View>
    </Modal>
  );
}

const confirmStyles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(21,33,31,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: 24, alignSelf: "stretch", maxWidth: 400 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: C.lightDanger,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
});

// ---------------------------------------------------------------------------
// Empty / Loading / ErrorState
// ---------------------------------------------------------------------------

export function Empty({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text?: string;
}) {
  const dir = useDirection();
  return (
    <View style={stateStyles.wrap}>
      <View style={stateStyles.iconCircle}>
        <Ionicons name={icon} size={26} color={C.teal} />
      </View>
      <Text style={[T.title, stateStyles.center, dir.text, { marginBottom: 4 }]}>{title}</Text>
      {!!text && <Text style={[T.caption, stateStyles.center, dir.text]}>{text}</Text>}
    </View>
  );
}

export function Loading({ text }: { text?: string }) {
  return (
    <View style={stateStyles.wrap}>
      <ActivityIndicator size="small" color={C.teal} />
      {!!text && <Text style={[T.caption, { marginTop: 10 }]}>{text}</Text>}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  const { t } = useI18n();
  const dir = useDirection();
  const message = error?.status === 404 ? t("errRouteMissing") : t("errLoadFailed");

  return (
    <View style={stateStyles.wrap}>
      <View style={[stateStyles.iconCircle, { backgroundColor: C.lightDanger }]}>
        <Ionicons name="cloud-offline-outline" size={26} color={C.danger} />
      </View>
      <Text style={[T.caption, stateStyles.center, dir.text, { marginBottom: 16 }]}>{message}</Text>
      <Btn title={t("tryAgain")} variant="outline" icon="refresh" size="sm" onPress={onRetry} />
    </View>
  );
}

const stateStyles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 16 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  center: { textAlign: "center" },
});

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
};

export function Field({ label, hint, style, multiline, onFocus, onBlur, ...rest }: FieldProps) {
  const dir = useDirection();
  const [focused, setFocused] = useState(false);
  return (
    <View style={fieldStyles.wrap}>
      {!!label && <Text style={[fieldStyles.label, dir.text]}>{label}</Text>}
      <TextInput
        placeholderTextColor={C.placeholder}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          fieldStyles.input,
          dir.text,
          multiline && fieldStyles.multiline,
          focused && fieldStyles.focused,
          Platform.OS === "web" && ({ outlineStyle: "none" } as any),
          style,
        ]}
        {...rest}
      />
      {!!hint && <Text style={[fieldStyles.hint, dir.text]}>{hint}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: C.text, fontSize: fs(15.5), fontWeight: "600", marginBottom: 8 },
  input: {
    minHeight: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    color: C.dark,
    fontSize: fs(17),
    fontWeight: "500",
  },
  focused: { borderColor: C.teal, backgroundColor: C.surface },
  multiline: { minHeight: 96, paddingTop: 13, textAlignVertical: "top" },
  hint: { color: C.subtle, fontSize: fs(14.5), lineHeight: fs(20), marginTop: 6 },
});

// ---------------------------------------------------------------------------
// ImageField — picks, uploads, and previews a single image
// ---------------------------------------------------------------------------

type ImageFieldProps = {
  label?: string;
  value?: string | null;
  folder: string;
  onChange: (path: string | null) => void;
  hint?: string;
};

export function ImageField({ label, value, folder, onChange, hint }: ImageFieldProps) {
  const { t } = useI18n();
  const dir = useDirection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(t("errPhotoDenied"));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (res.canceled || !res.assets?.[0]) return;

    setBusy(true);
    setError(null);
    try {
      const path = await uploadImage(res.assets[0], folder);
      onChange(path);
    } catch {
      setError(t("errUploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={fieldStyles.wrap}>
      {!!label && <Text style={[fieldStyles.label, dir.text]}>{label}</Text>}
      <Pressable onPress={pick} disabled={busy} style={[imageFieldStyles.box, dir.isRTL && { alignSelf: "flex-end" }]}>
        {busy ? (
          <ActivityIndicator size="small" color={C.teal} />
        ) : value ? (
          <Image source={{ uri: imageUrl(value) }} style={imageFieldStyles.preview} />
        ) : (
          <>
            <Ionicons name="image-outline" size={24} color={C.subtle} />
            <Text style={imageFieldStyles.placeholder}>{t("fieldPhoto")}</Text>
          </>
        )}
        {!!value && !busy && (
          <View style={imageFieldStyles.editBadge}>
            <Ionicons name="pencil" size={12} color={C.white} />
          </View>
        )}
      </Pressable>
      {!!error && <Text style={[fieldStyles.hint, { color: C.danger }]}>{error}</Text>}
      {!!hint && <Text style={[fieldStyles.hint, dir.text]}>{hint}</Text>}
    </View>
  );
}

const imageFieldStyles = StyleSheet.create({
  box: {
    width: 104,
    height: 104,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: C.borderStrong,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  preview: { width: "100%", height: "100%" },
  placeholder: { color: C.subtle, fontSize: fs(14), fontWeight: "600", marginTop: 6 },
  editBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ---------------------------------------------------------------------------
// Pill
// ---------------------------------------------------------------------------

type PillTone = "orange" | "teal" | "gray" | "danger";

export function Pill({ text, tone = "gray" }: { text: string; tone?: PillTone }) {
  const palette = PILL_PALETTE[tone];
  return (
    <View style={[pillStyles.wrap, { backgroundColor: palette.bg }]}>
      <View style={[pillStyles.dot, { backgroundColor: palette.fg }]} />
      <Text style={[pillStyles.text, { color: palette.fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const PILL_PALETTE: Record<PillTone, { bg: string; fg: string }> = {
  orange: { bg: C.lightOrange, fg: C.orange },
  teal: { bg: C.lightTeal, fg: C.teal },
  gray: { bg: C.surfaceAlt, fg: C.muted },
  danger: { bg: C.lightDanger, fg: C.danger },
};

const pillStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: fs(14), fontWeight: "700" },
});

// ---------------------------------------------------------------------------
// ToggleRow
// ---------------------------------------------------------------------------

export function ToggleRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const dir = useDirection();
  return (
    <View style={[toggleStyles.row, dir.row]}>
      <Text style={[toggleStyles.label, dir.text]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: C.teal, false: C.borderStrong }}
        thumbColor={C.white}
        {...(Platform.OS === "web" ? ({ activeThumbColor: C.white } as any) : {})}
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  label: { flex: 1, color: C.dark, fontSize: fs(16.5), fontWeight: "600" },
});
