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
   HEADING RING
   Two copies of the sentence, sitting on opposite sides of
   the exact same circle as the food images (180deg apart),
   driven by the exact same `rotation` value — so they swing
   left/right and scale up/down in perfect sync with the ring.
   Each copy's text is wrapped along its own small arc, and
   every character fades/shrinks by how far around that arc
   it sits — like it's wrapping around a cylinder.
===================================================== */

const HEADING_TEXT = "SEE TODAY'S BEST DEAL";
const HEADING_COPIES = 2;

const HEADING_ARC_RADIUS = 150;
const HEADING_ARC_SPAN = 80; // degrees the sentence wraps across — bigger = more of a side-wrap look

/* =====================================================
   MENU
===================================================== */

export default function Menu() {
  const [deals, setDeals] = useState([]);
  const [rotation, setRotation] = useState(0);

  /* =====================================================
     FOOD ROTATION REFS
  ====================================================== */

  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartRotation = useRef(0);
  const lastTimeRef = useRef(null);
  const rafRef = useRef(null);

  /* =====================================================
     FETCH DEALS
  ====================================================== */

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
  ====================================================== */

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
  ====================================================== */

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
  ====================================================== */

  const frontIndex = deals.length ? ((Math.trunc(rotation) % n) + n) % n : 0;

  /* =====================================================
     GO TO ACTIVE
  ====================================================== */

  function goToActive() {
    const target = deals[frontIndex] ?? deals[0];

    if (target) {
      router.push(`/menu-food/${target.categoryId}`);
    }
  }

  /* =====================================================
     RENDER
  ====================================================== */

  return (
    <View style={styles.container}>
      {/* =================================================
          HEADING RING
          Rides the exact same `rotation` as the food ring
          below it, so both move together as one carousel.
      ================================================= */}

      <View style={styles.headingArea}>
        {Array.from({ length: HEADING_COPIES }).map((_, index) => (
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
   Same circular math as RingItem, just spread evenly around
   the circle (180deg apart for 2 copies) and driven by the
   same shared `rotation` value as the food images.
========================================================= */

function HeadingCopy({ index, rotation }) {
  const angle = ((index - rotation) / HEADING_COPIES) * Math.PI * 2;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const depth = (cos + 1) / 2;

  const side = (sin + 1) / 2;

  const scale = 0.7 + depth * (1.15 - 0.7);

  const opacity = 0.35 + depth * (1 - 0.35);

  const rotateY = MAX_TILT_DEG - side * (MAX_TILT_DEG * 2);

  return (
    <View
      style={[
        styles.headingWord,

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
      <CurvedText text={HEADING_TEXT} />
    </View>
  );
}

/* =========================================================
   CURVED TEXT
   Wraps a sentence along an arc instead of a straight line.
   Every character gets its own position and rotation along
   the arc, and its own scale/opacity based on how far around
   the arc it sits — so the ends look like they're wrapping
   away to the side, like text wrapped around a cylinder.
========================================================= */

function CurvedText({ text }) {
  const chars = text.split("");

  const step = chars.length > 1 ? HEADING_ARC_SPAN / (chars.length - 1) : 0;

  const start = -HEADING_ARC_SPAN / 2;

  return (
    <>
      {chars.map((ch, i) => {
        const angleDeg = start + step * i;
        const angleRad = (angleDeg * Math.PI) / 180;

        const x = HEADING_ARC_RADIUS * Math.sin(angleRad);
        const y = HEADING_ARC_RADIUS * (1 - Math.cos(angleRad));

        const depth = (Math.cos(angleRad) + 1) / 2;

        const charScale = 0.75 + depth * 0.25;
        const charOpacity = 0.4 + depth * 0.6;

        return (
          <Text
            key={i}
            style={[
              styles.headingChar,
              {
                opacity: charOpacity,
                zIndex: Math.round(depth * 100),

                transform: [
                  {
                    translateX: x,
                  },
                  {
                    translateY: y,
                  },
                  {
                    rotate: `${angleDeg}deg`,
                  },
                  {
                    scale: charScale,
                  },
                ],
              },
            ]}
          >
            {ch}
          </Text>
        );
      })}
    </>
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
  },

  headingWord: {
    position: "absolute",

    left: "50%",

    top: "50%",

    width: 260,

    height: 90,

    marginLeft: -130,

    marginTop: -45,
  },

  headingChar: {
    position: "absolute",

    left: "50%",

    top: 0,

    width: 20,

    marginLeft: -10,

    color: "#ED5529",

    fontSize: 18,

    fontWeight: "900",

    textAlign: "center",
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
