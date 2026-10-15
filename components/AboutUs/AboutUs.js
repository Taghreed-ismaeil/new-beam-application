import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { getFooterFadeHeight } from "@/components/Footer/Footer";
import { useAppLang } from "@/lib/app-lang";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export const FLAME_FRAMES = [
  require("../../assets/flame-frames/f01.png"),
  require("../../assets/flame-frames/f02.png"),
  require("../../assets/flame-frames/f03.png"),
  require("../../assets/flame-frames/f04.png"),
  require("../../assets/flame-frames/f05.png"),
  require("../../assets/flame-frames/f06.png"),
  require("../../assets/flame-frames/f07.png"),
  require("../../assets/flame-frames/f08.png"),
  require("../../assets/flame-frames/f09.png"),
  require("../../assets/flame-frames/f10.png"),
  require("../../assets/flame-frames/f11.png"),
  require("../../assets/flame-frames/f12.png"),
  require("../../assets/flame-frames/f13.png"),
  require("../../assets/flame-frames/f14.png"),
  require("../../assets/flame-frames/f15.png"),
  require("../../assets/flame-frames/f16.png"),
  require("../../assets/flame-frames/f17.png"),
  require("../../assets/flame-frames/f18.png"),
  require("../../assets/flame-frames/f19.png"),
  require("../../assets/flame-frames/f20.png"),
  require("../../assets/flame-frames/f21.png"),
  require("../../assets/flame-frames/f22.png"),
  require("../../assets/flame-frames/f23.png"),
  require("../../assets/flame-frames/f24.png"),
  require("../../assets/flame-frames/f25.png"),
  require("../../assets/flame-frames/f26.png"),
  require("../../assets/flame-frames/f27.png"),
  require("../../assets/flame-frames/f28.png"),
  require("../../assets/flame-frames/f29.png"),
  require("../../assets/flame-frames/f30.png"),
  require("../../assets/flame-frames/f31.png"),
  require("../../assets/flame-frames/f32.png"),
];

const FRAME_INTERVAL_MS = 90;

const FLAME_ASPECT = 280 / 168;
const FLAME_OVERLAP = 0.3;
const FLAME_TOP_FADE = 0.35; // how much of the flame's top fades into white

function FlameLoop({ style }) {
  const [frameIndex, setFrameIndex] = useState(0);

  // Paused while Home isn't the focused screen, so it doesn't keep
  // re-rendering underneath the other pages.
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => {
        setFrameIndex((i) => (i + 1) % FLAME_FRAMES.length);
      }, FRAME_INTERVAL_MS);

      return () => clearInterval(id);
    }, []),
  );

  return (
    <Image
      source={FLAME_FRAMES[frameIndex]}
      style={style}
      resizeMode="contain"
    />
  );
}

export default function AboutUs() {
  const [buttonSize, setButtonSize] = useState(null);

  const { width } = useWindowDimensions();
  const { t, dir } = useAppLang();

  // The footer's green fade reaches this far up over our bottom. Leaving
  // that much empty white space (+ a small gap) means the fade only ever
  // lands on plain white — never on the About Beam button or the chef.
  const bottomSpace = getFooterFadeHeight(width) + 20;

  const flameWidth = buttonSize ? buttonSize.width : 0;
  const flameHeight = flameWidth / FLAME_ASPECT;

  // How far the flame pokes up above the button's top edge. The button wrap
  // reserves at least this much room so the flame never covers the text
  // (a fixed 45 wasn't enough when the description wraps onto many lines).
  const flameReach = buttonSize
    ? flameHeight - buttonSize.height * FLAME_OVERLAP + 10
    : 0;
  const buttonTopSpace = Math.max(45, flameReach + 8);

  return (
    <View style={[styles.container, { paddingBottom: bottomSpace }]}>
      {/* =====================================================
          ROW:  CHEF (left)  |  TITLE + TEXT + BUTTON (right)
      ===================================================== */}

      <View style={styles.row}>
        {/* ===================================================
            CHEF — ع الشمال
        =================================================== */}

        <View style={styles.chefWrapper}>
          {/* -----------------------------------------------
              BORDER
              أصغر من الصورة حتى الإيدين تطلع برا
          ------------------------------------------------ */}

          <View style={styles.chefBorder} />

          {/* -----------------------------------------------
              CHEF IMAGE
          ------------------------------------------------ */}

          <ExpoImage
            source={require("../../assets/img/chef_beam_about-remove.jpg")}
            style={styles.chefImage}
            contentFit="contain"
          />
        </View>

        {/* ===================================================
            TEXT COLUMN — ع يمين الشيف، تحت بعض
        =================================================== */}

        <View style={styles.textColumn}>
          {/* TITLE + DESCRIPTION — grouped so they stay together at the top */}
          <View>
            <Text style={[styles.heading, dir.text, dir.isRTL && styles.headingAr]}>
              {t("aboutCardTitle")}{" "}
              <Text style={styles.headingTeal}>{t("aboutCardTitleTeal")}</Text>
              {dir.isRTL ? ` ${t("aboutCardTitleAfter")}` : null}
            </Text>

            {/* DESCRIPTION */}
            <Text style={[styles.description, dir.text, dir.isRTL && styles.descriptionAr]}>
              {t("aboutCardText")}
            </Text>
          </View>

          {/* BUTTON — تحت الكلام */}
          <View style={[styles.buttonWrap, { marginTop: buttonTopSpace }]}>
            {buttonSize && (
              <FlameLoop
                style={[
                  styles.flame,
                  {
                    width: flameWidth,
                    height: flameHeight,

                    left: 0,

                    top: -flameHeight + buttonSize.height * FLAME_OVERLAP - 10,
                  },
                ]}
              />
            )}

            {/* The flame frames themselves are cut flat at the top (the tips
                touch the image's top edge), so a bigger box can't show more.
                This white fade melts that flat cut into the white background
                so the flame tips look like they burn out naturally. */}
            {buttonSize && (
              <LinearGradient
                colors={["#fff", "rgba(255,255,255,0)"]}
                pointerEvents="none"
                style={[
                  styles.flameTopFade,
                  {
                    width: flameWidth,
                    height: flameHeight * FLAME_TOP_FADE,
                    left: 0,
                    top: -flameHeight + buttonSize.height * FLAME_OVERLAP - 10,
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push("/about")}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;

                setButtonSize({
                  width,
                  height,
                });
              }}
            >
              <Text style={styles.buttonText}>{t("aboutCardButton")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // =====================================================
  // CONTAINER
  // =====================================================

  container: {
    width: "100%",

    backgroundColor: "#fff",

    // Tucks 1px under the section above so a sub-pixel gap can't show as a line.
    marginTop: -1,

    padding: 20,

    paddingTop: 50, // مسافة من فوق — كانت 30

    // paddingBottom is set inline from the footer fade height (see above).
  },

  // =====================================================
  // ROW — chef on the left, text column on the right
  // =====================================================

  row: {
    width: "100%",

    // row-reverse: الشيف ع اليمين والكلام ع الشمال
    flexDirection: "row-reverse",

    // flex-end: the text column (and the button + flame at its bottom) sits
    // on the same bottom line as the chef image.
    alignItems: "flex-end",

    overflow: "visible",
  },

  // =====================================================
  // TEXT COLUMN
  // =====================================================

  textColumn: {
    flex: 1,

    minWidth: 0,

    // Gap between the text and the chef (the chef image sticks out ~10px
    // past its wrapper on this side).
    marginRight: 24,

    // Stretch to the chef's full height: title at the top, button at the bottom.
    alignSelf: "stretch",

    justifyContent: "space-between",

    // The chef image (408×612, "contain" in 175×270) starts ~11px above the
    // wrapper — that's the top of the hat. -11 lines the title up with it.
    marginTop: -11,

    // The chef image/border hang 5px below their wrapper (bottom: -5),
    // so -5 here puts the button's bottom exactly on the image's bottom.
    marginBottom: -5,

    alignItems: "flex-start",
  },

  // =====================================================
  // HEADING
  // =====================================================

  heading: {
    fontSize: 22,

    lineHeight: 26,

    fontWeight: "900",

    color: "#FC4A14",

    textAlign: "left",

    marginBottom: 10,
  },

  // Arabic glyphs read smaller than Latin at the same size.
  headingAr: {
    fontSize: 25,
    lineHeight: 32,
  },

  descriptionAr: {
    fontSize: 16,
    lineHeight: 24,
  },

  headingTeal: {
    color: "#00827A", // teal
  },

  // =====================================================
  // DESCRIPTION
  // =====================================================

  description: {
    fontSize: 14,

    color: "#000",

    lineHeight: 19,

    textAlign: "left",
  },

  // =====================================================
  // BUTTON WRAPPER
  // =====================================================

  buttonWrap: {
    position: "relative",

    alignItems: "center",

    overflow: "visible",

    // Room above the button for the flame (marginTop) is set inline from the
    // flame's real height — the column's space-between adds any extra on top.

    marginLeft: 20, // بيجيب الزر (والنار معه) لليمين شوي
  },

  // =====================================================
  // FLAME
  // =====================================================

  flame: {
    position: "absolute",

    zIndex: 1,
  },

  // Sits over the flame's top edge (above the flame, below the button).
  flameTopFade: {
    position: "absolute",

    zIndex: 1,
  },

  // =====================================================
  // BUTTON
  // =====================================================

  button: {
    // Solid white fill — nothing from behind (flame or fade) shows through.
    backgroundColor: "#fff",

    paddingVertical: 8,

    paddingHorizontal: 10,

    borderRadius: 30,

    borderWidth: 4,

    borderColor: "#FC4A14",

    // Same size in Arabic and English — "عن بيم" is much shorter than
    // "About Beam", and the flame is sized from the button width.
    minWidth: 106,

    alignItems: "center",

    zIndex: 2,
  },

  buttonText: {
    color: "#FC4A14",

    fontSize: 13,

    fontWeight: "700",
  },

  // =====================================================
  // CHEF WRAPPER
  // =====================================================

  chefWrapper: {
    width: 155,

    height: 250,

    position: "relative",

    overflow: "visible",

    justifyContent: "flex-end",

    alignItems: "center",

    flexShrink: 0,
  },

  // =====================================================
  // CHEF BORDER
  // =====================================================

  /*
   * هذا الـ Border أصغر من الصورة
   * لذلك الإيدين الموجودة على الجوانب
   * بتطلع برا الـ Border.
   */

  chefBorder: {
    position: "absolute",

    width: 148,

    height: 230,

    bottom: -5,

    left: 20,

    backgroundColor: "#fff",

    borderWidth: 4,

    borderColor: "#FC4A14",

    borderRadius: 0,

    zIndex: 1,
  },

  // =====================================================
  // CHEF IMAGE
  // =====================================================

  chefImage: {
    position: "absolute",

    width: 175,

    height: 270,

    bottom: -5,

    left: -10,

    zIndex: 2,
  },
});
