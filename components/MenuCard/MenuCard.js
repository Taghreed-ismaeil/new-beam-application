import { apiRequestCached, imageUrl } from "@/lib/api-client";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const FALLBACK_IMAGE = require("../../assets/img/menu-1.jpg");

const CIRCLE_SIZE = 100;

const RADIUS_X = Math.min(Dimensions.get("window").width, 480) / 2 - 36;

/* =====================================================
   FOOD CAROUSEL
===================================================== */

const AUTO_SPIN_SPEED = 0.225;
const DRAG_SENSITIVITY = 90;
const MOMENTUM_DECAY = 0.94;
const MAX_TILT_DEG = 38;

/* =====================================================
   HEADING
===================================================== */

const HEADING_TEXT = "SEE TODAY'S BEST DEAL";
const HEADING_COPIES = 3;

/*
  3 sentences distributed around the same
  circular path as the food carousel.
*/
const HEADING_CIRCLE_STEP = (Math.PI * 2) / HEADING_COPIES;

/*
  How much the COMPLETE sentence rotates
  backward when it moves to the sides.
*/
const HEADING_TILT = 38;

/* =====================================================
   MENU
===================================================== */

export default function Menu() {
  const [deals, setDeals] = useState([]);
  const [rotation, setRotation] = useState(0);

  /* =====================================================
     FOOD ROTATION REFS
  ===================================================== */

  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartRotation = useRef(0);
  const lastTimeRef = useRef(null);
  const rafRef = useRef(null);

  /* =====================================================
     FETCH DEALS
  ===================================================== */

  useEffect(() => {
    apiRequestCached("/api/menu", (data) => {
      const allItems = data.categories.flatMap((category) =>
        category.items.map((item) => ({
          ...item,
          categoryId: category.id,
        })),
      );

      const featured = allItems.filter((item) => item.hasLoyalty);

      setDeals(featured.slice(0, 8));
    });
  }, []);

  const n = deals.length || 1;

  /* =====================================================
     FOOD AUTO ROTATION
  ===================================================== */

  useEffect(() => {
    function tick(time) {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }

      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);

      lastTimeRef.current = time;

      if (!draggingRef.current) {
        if (Math.abs(velocityRef.current) > 0.002) {
          rotationRef.current += velocityRef.current * dt;

          velocityRef.current *= Math.pow(MOMENTUM_DECAY, dt * 60);
        } else {
          velocityRef.current = 0;

          rotationRef.current += AUTO_SPIN_SPEED * dt;
        }

        setRotation(rotationRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  /* =====================================================
     FOOD DRAG
  ===================================================== */

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 6,

      onPanResponderGrant: () => {
        draggingRef.current = true;

        velocityRef.current = 0;

        dragStartRotation.current = rotationRef.current;
      },

      onPanResponderMove: (_, gesture) => {
        rotationRef.current =
          dragStartRotation.current - gesture.dx / DRAG_SENSITIVITY;

        setRotation(rotationRef.current);
      },

      onPanResponderRelease: (_, gesture) => {
        draggingRef.current = false;

        velocityRef.current = -(gesture.vx * 1000) / DRAG_SENSITIVITY / 60;
      },

      onPanResponderTerminate: () => {
        draggingRef.current = false;

        velocityRef.current = 0;
      },
    }),
  ).current;

  /* =====================================================
     ACTIVE FOOD
  ===================================================== */

  const frontIndex = deals.length ? ((Math.trunc(rotation) % n) + n) % n : 0;

  /* =====================================================
     GO TO ACTIVE
  ===================================================== */

  function goToActive() {
    const target = deals[frontIndex] ?? deals[0];

    if (target) {
      router.push(`/menu-food/${target.categoryId}`);
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <View style={styles.container}>
      {/* =================================================
          HEADING
      ================================================= */}

      <View style={styles.headingArea}>
        {Array.from({
          length: HEADING_COPIES,
        }).map((_, index) => (
          <HeadingCopy key={index} index={index} rotation={rotation} />
        ))}
      </View>

      {/* =================================================
          FOOD CAROUSEL
      ================================================= */}

      <View style={styles.ring} {...panResponder.panHandlers}>
        {deals.map((item, index) => (
          <RingItem
            key={item.id}
            item={item}
            index={index}
            n={n}
            rotation={rotation}
            activeIndex={frontIndex}
          />
        ))}

        <Pressable style={styles.tapCatcher} onPress={goToActive} />
      </View>
    </View>
  );
}

/* =========================================================
   HEADING COPY

   IMPORTANT:
   The complete sentence is ONE Text element.

   The letters never move individually.
   The complete sentence moves as one object.
========================================================= */

function HeadingCopy({ index, rotation }) {
  /*
    Position of this sentence around the circle.
  */

  const angle = index * HEADING_CIRCLE_STEP - rotation;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  /*
    SAME horizontal movement as the food images.
  */

  const translateX = sin * RADIUS_X;

  /*
    Depth of the sentence.
  */

  const depth = (cos + 1) / 2;

  /*
    Keep the sentence readable.
  */

  const scale = 0.9 + depth * 0.1;

  /*
    Do not make it disappear.
  */

  const opacity = 0.8 + depth * 0.2;

  /*
    Rotate the COMPLETE sentence.

    Left/right sides go backwards,
    exactly like an object sitting on a cylinder.
  */

  const rotateY = -sin * HEADING_TILT;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.headingWord,
        {
          transform: [
            {
              translateX,
            },
            {
              perspective: 1000,
            },
            {
              rotateY: `${rotateY}deg`,
            },
            {
              scale,
            },
          ],

          opacity,

          zIndex: Math.round(cos * 100),
        },
      ]}
    >
      <Text style={styles.headingText}>{HEADING_TEXT}</Text>
    </View>
  );
}

/* =========================================================
   FOOD RING ITEM
========================================================= */

function RingItem({ item, index, n, rotation, activeIndex }) {
  const angle = ((index - rotation) / n) * Math.PI * 2;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const depth = (cos + 1) / 2;

  const side = (sin + 1) / 2;

  const scale = 0.58 + depth * (1.3 - 0.58);

  const opacity = 0.3 + depth * (1 - 0.3);

  const rotateY = MAX_TILT_DEG - side * (MAX_TILT_DEG * 2);

  const isActive = index === activeIndex;

  return (
    <View
      style={[
        styles.slot,
        {
          transform: [
            {
              translateX: sin * RADIUS_X,
            },
            {
              perspective: 1000,
            },
            {
              scale,
            },
            {
              rotateY: `${rotateY}deg`,
            },
          ],

          opacity,

          zIndex: Math.round(cos * 100),
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.card, isActive && styles.cardActive]}>
        <Image
          source={
            item.imageUrl
              ? {
                  uri: imageUrl(item.imageUrl),
                }
              : FALLBACK_IMAGE
          }
          style={styles.image}
        />
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* ================= CONTAINER ================= */

  container: {
    backgroundColor: "#fff",

    paddingVertical: 20,

    alignItems: "center",

    overflow: "hidden",
  },

  /* ================= HEADING ================= */

  headingArea: {
    width: "100%",

    height: 100,

    marginBottom: 5,

    overflow: "hidden",

    alignItems: "center",

    justifyContent: "center",
  },

  /*
    Container for the COMPLETE sentence.

    Same width as the food rotation area.
  */

  headingWord: {
    position: "absolute",

    left: "50%",

    top: "50%",

    width: RADIUS_X * 2,

    height: 55,

    marginLeft: -RADIUS_X,

    marginTop: -27.5,

    alignItems: "center",

    justifyContent: "center",

    overflow: "visible",
  },

  /*
    ONE single Text.

    No character-by-character animation.
  */

  headingText: {
    color: "#ED5529",

    fontSize: 18,

    fontWeight: "900",

    textAlign: "center",

    width: "100%",

    includeFontPadding: false,

    flexWrap: "nowrap",

    whiteSpace: "nowrap",
  },

  /* ================= FOOD RING ================= */

  ring: {
    width: "100%",

    height: CIRCLE_SIZE + 20,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 20,
  },

  slot: {
    position: "absolute",

    width: CIRCLE_SIZE,

    height: CIRCLE_SIZE,
  },

  /* ================= FOOD CARD ================= */

  card: {
    width: "100%",

    height: "100%",

    borderRadius: CIRCLE_SIZE / 2,

    overflow: "hidden",

    borderWidth: 3,

    borderColor: "#fff",

    backgroundColor: "#eee",

    elevation: 4,

    shadowColor: "#008E82",

    shadowOpacity: 0.15,

    shadowRadius: 6,

    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  cardActive: {
    borderColor: "#ED5529",

    elevation: 10,

    shadowOpacity: 0.3,

    shadowRadius: 12,
  },

  tapCatcher: {
    position: "absolute",

    width: CIRCLE_SIZE,

    height: CIRCLE_SIZE,

    borderRadius: CIRCLE_SIZE / 2,

    zIndex: 1000,
  },

  image: {
    width: "100%",

    height: "100%",
  },
});
