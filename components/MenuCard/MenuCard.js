import { apiRequestCached, imageUrl } from "@/lib/api-client";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
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

const AUTO_SPIN_SPEED = 0.225;
const DRAG_SENSITIVITY = 90;
const MOMENTUM_DECAY = 0.94;
const MAX_TILT_DEG = 38;

const OFFERS = {
  Shawarma: {
    badge: "-15%",
    tagline: "Hand-carved shawarma, wrapped fresh and grilled to perfection.",
  },
  Burger: {
    badge: "-20%",
    tagline: "Juicy, cheesy, and stacked high — limited time only.",
  },
  Fajita: {
    badge: "-10%",
    tagline: "Sizzling chicken fajita, fresh off the grill.",
  },
  "Steak Sandwich": {
    badge: "-15%",
    tagline: "Premium steak, toasted bread, unbeatable flavor.",
  },
};

const DEFAULT_OFFER = {
  badge: "-10%",
  tagline: "Today's chef special — don't miss it.",
};

export default function Menu() {
  const [deals, setDeals] = useState([]);
  const [rotation, setRotation] = useState(0);
  const [displayedIndex, setDisplayedIndex] = useState(0);

  const offerOpacity = useRef(new Animated.Value(1)).current;

  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartRotation = useRef(0);
  const lastTimeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    apiRequestCached("/api/menu", (data) => {
      const allItems = data.categories.flatMap((c) =>
        c.items.map((i) => ({
          ...i,
          categoryId: c.id,
        })),
      );

      const featured = allItems.filter((i) => i.hasLoyalty);

      setDeals(featured.slice(0, 8));
    });
  }, []);

  const n = deals.length || 1;

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

  /*
   * IMPORTANT:
   *
   * We use Math.trunc instead of Math.round.
   *
   * Math.round was making the next image active
   * before it actually reached the center.
   *
   * Math.trunc keeps the current image orange
   * until the next image REALLY reaches the center.
   */
  const frontIndex = deals.length ? ((Math.trunc(rotation) % n) + n) % n : 0;

  useEffect(() => {
    if (deals.length === 0) return;

    Animated.timing(offerOpacity, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setDisplayedIndex(frontIndex);

      Animated.timing(offerOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontIndex, deals.length]);

  if (deals.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>SEE TODAYS BEST DEAL !!!</Text>

        <View style={styles.ring}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.slot,
                styles.skeletonSlot,
                {
                  transform: [
                    {
                      translateX: (i - 1) * 90,
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  const activeItem = deals[displayedIndex] ?? deals[0];

  const offer = OFFERS[activeItem.nameEn || activeItem.name] || DEFAULT_OFFER;

  function goToActive() {
    const target = deals[frontIndex] ?? deals[0];

    if (target) {
      router.push(`/menu-food/${target.categoryId}`);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>SEE TODAYS BEST DEAL !!!</Text>

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

      <Animated.View
        style={{
          opacity: offerOpacity,
          width: "100%",
          alignItems: "center",
        }}
      >
        <Pressable style={styles.offerCard} onPress={goToActive}>
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>{offer.badge}</Text>
          </View>

          <Text style={styles.offerName}>
            {activeItem.nameEn || activeItem.name}
          </Text>

          <Text style={styles.offerTagline}>{offer.tagline}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function RingItem({ item, index, n, rotation, activeIndex }) {
  const angle = ((index - rotation) / n) * Math.PI * 2;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const depth = (cos + 1) / 2;
  const side = (sin + 1) / 2;

  const scale = 0.58 + depth * (1.3 - 0.58);

  const opacity = 0.3 + depth * (1 - 0.3);

  const rotateY = MAX_TILT_DEG - side * (MAX_TILT_DEG * 2);

  /*
   * ONLY the image whose index is actually active
   * gets the orange border.
   *
   * It stays orange while moving away from center.
   * It changes ONLY when the next image reaches center.
   */
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingVertical: 30,
    alignItems: "center",
  },

  heading: {
    color: "#ED5529",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 45,
  },

  ring: {
    width: "100%",
    height: CIRCLE_SIZE + 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 35,
  },

  skeletonSlot: {
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#eee",
  },

  slot: {
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },

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

  offerCard: {
    marginTop: 10,
    width: "82%",
    maxWidth: 340,
    backgroundColor: "#008E82",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",

    elevation: 6,

    shadowColor: "#008E82",
    shadowOpacity: 0.25,
    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  offerBadge: {
    backgroundColor: "#ED5529",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 8,
  },

  offerBadgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
  },

  offerName: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
  },

  offerTagline: {
    color: "#ccc",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
