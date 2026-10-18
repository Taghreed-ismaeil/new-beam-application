import {
  IBMPlexSansArabic_300Light,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { createElement, forwardRef } from "react";
import {
  Animated as RNAnimated,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextStyle,
} from "react-native";
import Reanimated from "react-native-reanimated";

/* =========================================================
   ARABIC FONT — IBM Plex Sans Arabic
   One calm, modern family for every Arabic string in the app.
   Screens import Text / TextInput / AnimatedText from here instead
   of react-native: any text that contains Arabic gets the Plex
   face matching its fontWeight; English text and icon glyphs
   (no Arabic in them) render exactly as before.
========================================================= */

/** Pass to useFonts() in the root layout. */
export const ARABIC_FONTS = {
  IBMPlexSansArabic_300Light,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
};

// Custom fonts ship one file per weight, and Android ignores fontWeight once a
// custom fontFamily is set — so the weight picks the file. Plex Arabic tops
// out at Bold; 800/900 map to Bold too.
function familyFor(weight: TextStyle["fontWeight"]): string {
  const w = weight === "bold" ? 700 : weight === "normal" || weight == null ? 400 : Number(weight) || 400;
  if (w <= 300) return "IBMPlexSansArabic_300Light";
  if (w <= 400) return "IBMPlexSansArabic_400Regular";
  if (w <= 500) return "IBMPlexSansArabic_500Medium";
  if (w <= 600) return "IBMPlexSansArabic_600SemiBold";
  return "IBMPlexSansArabic_700Bold";
}

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

function hasArabic(node: unknown): boolean {
  if (typeof node === "string") return ARABIC.test(node);
  if (Array.isArray(node)) return node.some(hasArabic);
  return false;
}

function arabicStyle(style: unknown) {
  const flat = (StyleSheet.flatten(style as any) ?? {}) as TextStyle;
  // fontWeight "normal" so iOS doesn't synthesise bold on top of the Bold file
  return [style, { fontFamily: familyFor(flat.fontWeight), fontWeight: "normal" as const }];
}

const BaseText = RNText as any;
const BaseTextInput = RNTextInput as any;

/** Drop-in for react-native's Text. */
export const Text = forwardRef<any, any>(function Text(props, ref) {
  if (!hasArabic(props.children)) return createElement(BaseText, { ...props, ref });
  return createElement(BaseText, { ...props, ref, style: arabicStyle(props.style) });
}) as unknown as typeof RNText;

/** Drop-in for react-native's TextInput (Arabic value or placeholder → Plex). */
export const TextInput = forwardRef<any, any>(function TextInput(props, ref) {
  if (!hasArabic(props.value) && !hasArabic(props.placeholder) && !hasArabic(props.defaultValue))
    return createElement(BaseTextInput, { ...props, ref });
  return createElement(BaseTextInput, { ...props, ref, style: arabicStyle(props.style) });
}) as unknown as typeof RNTextInput;

/** Reanimated's Animated.Text, Arabic-aware. */
export const AnimatedText = Reanimated.createAnimatedComponent(Text as any) as unknown as typeof Reanimated.Text;

/** react-native Animated.Text, Arabic-aware. */
export const RNAnimatedText = RNAnimated.createAnimatedComponent(Text as any) as unknown as typeof RNAnimated.Text;
