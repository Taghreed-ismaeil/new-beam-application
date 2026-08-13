import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const FLAME_FRAMES = [
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

function FlameLoop({ style }) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % FLAME_FRAMES.length);
    }, FRAME_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

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

  const flameWidth = buttonSize ? buttonSize.width : 0;
  const flameHeight = flameWidth / FLAME_ASPECT;

  return (
    <View style={styles.container}>
      {/* =====================================================
          TITLE
      ===================================================== */}

      <Text style={styles.heading}>We are Beam Restaurant</Text>

      {/* =====================================================
          DESCRIPTION
      ===================================================== */}

      <Text style={styles.description}>
        Craving delicious meals without the hassle of cooking or leaving your
        home? Beam brings your favorite food with fast and easy delivery.
      </Text>

      {/* =====================================================
          BUTTON + CHEF
      ===================================================== */}

      <View style={styles.bottomRow}>
        {/* ===================================================
            BUTTON
        =================================================== */}

        <View style={styles.buttonWrap}>
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
            <Text style={styles.buttonText}>About Beam</Text>
          </TouchableOpacity>
        </View>

        {/* ===================================================
            CHEF
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

          <Image
            source={require("../../assets/img/chef_beam_about-remove.jpg")}
            style={styles.chefImage}
            resizeMode="contain"
          />
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

    padding: 20,
  },

  // =====================================================
  // HEADING
  // =====================================================

  heading: {
    fontSize: 24,

    fontWeight: "900",

    color: "#ED5529",

    textAlign: "center",

    marginBottom: 15,
  },

  // =====================================================
  // DESCRIPTION
  // =====================================================

  description: {
    fontSize: 15,

    color: "#000",

    lineHeight: 20,

    textAlign: "center",

    marginBottom: 25,
  },

  // =====================================================
  // BOTTOM ROW
  // =====================================================

  bottomRow: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginTop: 40,

    overflow: "visible",
  },

  // =====================================================
  // BUTTON WRAPPER
  // =====================================================

  buttonWrap: {
    position: "relative",

    alignItems: "center",

    overflow: "visible",

    flexShrink: 0,
  },

  // =====================================================
  // FLAME
  // =====================================================

  flame: {
    position: "absolute",

    zIndex: 1,

    marginLeft: 15,
  },

  // =====================================================
  // BUTTON
  // =====================================================

  button: {
    backgroundColor: "transparent",

    paddingVertical: 8,

    paddingHorizontal: 10,

    borderRadius: 30,

    borderWidth: 4,

    borderColor: "#ED5529",

    zIndex: 2,

    marginLeft: 14,
  },

  buttonText: {
    color: "#ED5529",

    fontSize: 13,

    fontWeight: "700",
  },

  // =====================================================
  // CHEF WRAPPER
  // =====================================================

  chefWrapper: {
    width: 155,

    height: 250,

    marginRight: 5,

    marginBottom: 45,

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

    borderColor: "#ED5529",

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
