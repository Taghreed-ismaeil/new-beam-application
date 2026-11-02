import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";

/* =========================================================
   ORDER TRACKER CARD
   The teal card on the order-tracking page: "Order #36", a row
   of step icons that light up as the restaurant moves the order
   along, the status under it, and — while the kitchen allows —
   buttons to change the order or add to it.
   Motion is kept calm: the finished stretches of line fill in
   one after another, the steps they reach fade up to white,
   and the current step breathes with a soft glow.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";
const MINT = "#9FE1CB";

// Status label keys in lib/app-strings.ts (same as the orders screen)
export const STATUS_LABEL = {
  pending: "statusPending",
  accepted: "statusAccepted",
  preparing: "statusPreparing",
  ready: "statusReady",
  out_for_delivery: "statusOnTheWay",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
};

// order sent → kitchen → ready / on the way → done. Delivery ends at the door;
// pickup and dine-in end with the order handed over.
export function trackSteps(orderType) {
  const delivery = orderType === "delivery";
  return [
    { icon: "receipt-outline", statuses: ["pending", "accepted"] },
    { icon: "restaurant-outline", statuses: ["preparing"] },
    {
      icon: delivery ? "bicycle-outline" : "bag-check-outline",
      statuses: ["ready", "out_for_delivery"],
    },
    { icon: delivery ? "home-outline" : "checkmark-done-outline", statuses: ["completed"] },
  ];
}

export function trackStepIndex(order) {
  const at = trackSteps(order.orderType).findIndex((s) => s.statuses.includes(order.status));
  return at < 0 ? 0 : at;
}

// showTitle=false where the page around it already says "Order #36"
export default function OrderTrackerCard({ order, hint, onEdit, onAdd, showTitle = true }) {
  const { t, dir } = useAppLang();
  const steps = trackSteps(order.orderType);
  const at = trackStepIndex(order);
  const canEdit = !!order.can?.edit && !!onEdit;
  const canAdd = !!order.can?.add && !!onAdd;

  return (
    <View style={styles.card}>
      {showTitle && (
        <Text style={[styles.title, dir.text]} numberOfLines={1}>
          {t("cartOrderNumber", { id: order.id })}
        </Text>
      )}

      {/* the steps: done ones white, the current one orange, the rest faint */}
      <View style={[styles.tracker, showTitle && styles.trackerUnderTitle]}>
        {steps.map((step, i) => {
          const done = i < at;
          const now = i === at;
          return (
            <View key={step.icon} style={[styles.part, i > 0 && styles.partLined]}>
              {i > 0 && <Line filled={i <= at} order={i} />}
              <Dot icon={step.icon} done={done} now={now} order={i} />
            </View>
          );
        })}
      </View>

      <Text style={[styles.status, dir.text]}>
        {t(STATUS_LABEL[order.status] ?? "statusPending")}
        {order.status === "completed" ? "" : "…"}
      </Text>
      {!!hint && <Text style={[styles.hint, dir.text]}>{hint}</Text>}

      {/* before the kitchen starts: change the order or add to it; after: add only */}
      {(canEdit || canAdd) && (
        <View style={[styles.actions, dir.row]}>
          {canEdit && (
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onEdit} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={16} color={WHITE} />
              <Text style={[styles.btnText, { color: WHITE }]}>{t("cartChooseEdit")}</Text>
            </TouchableOpacity>
          )}
          {canAdd && (
            <TouchableOpacity style={[styles.btn, styles.btnWhite]} onPress={onAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={17} color={TEAL} />
              <Text style={[styles.btnText, { color: TEAL }]}>{t("cartChooseAdd")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// how long each stretch of line takes to fill, and the pause before the next
const FILL_MS = 650;
const STEP_MS = 420;
const calm = Easing.inOut(Easing.cubic);

/** A stretch of line between two steps; a finished one fills in from the start. */
function Line({ filled, order }) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(reduceMotion && filled ? 1 : 0);

  useEffect(() => {
    if (!filled) return;
    fill.value = reduceMotion ? 1 : withDelay(250 + (order - 1) * STEP_MS, withTiming(1, { duration: FILL_MS, easing: calm }));
  }, [filled, order, reduceMotion, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={styles.line}>
      <Animated.View style={[styles.lineFill, fillStyle]} />
    </View>
  );
}

/** One step's icon. Finished steps fade up to white as the line reaches them;
 *  the current one breathes with a soft orange glow. */
function Dot({ icon, done, now, order }) {
  const reduceMotion = useReducedMotion();
  const lit = useSharedValue(reduceMotion || !done ? 1 : 0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    if (done) {
      // the first step is lit at once; later ones when their line arrives
      lit.value = withDelay(order === 0 ? 150 : 250 + order * STEP_MS, withTiming(1, { duration: 450, easing: calm }));
    }
    if (now) {
      glow.value = withDelay(
        250 + order * STEP_MS,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1600, easing: calm }),
            withTiming(0, { duration: 1600, easing: calm }),
          ),
          -1,
        ),
      );
    }
  }, [done, now, order, reduceMotion, lit, glow]);

  const litStyle = useAnimatedStyle(() => ({ opacity: 0.35 + lit.value * 0.65 }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + glow.value * 0.22,
    transform: [{ scale: 1.15 + glow.value * 0.2 }],
  }));

  return (
    <View style={styles.dotWrap}>
      {now && <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />}
      <Animated.View style={[styles.dot, done && styles.dotDone, now && styles.dotNow, done && litStyle]}>
        <Ionicons name={icon} size={now ? 19 : 16} color={now ? WHITE : done ? TEAL : MINT} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: TEAL,
    shadowColor: TEAL,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: {
    color: WHITE,
    fontSize: 19,
    fontWeight: "900",
  },
  tracker: {
    flexDirection: "row",
    alignItems: "center",
  },
  trackerUnderTitle: {
    marginTop: 16,
  },
  // each step after the first carries the line leading up to it
  part: {
    flexDirection: "row",
    alignItems: "center",
  },
  partLined: {
    flex: 1,
  },
  line: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 5,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  lineFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: WHITE,
  },
  dotWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ORANGE,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  dotDone: {
    backgroundColor: WHITE,
  },
  dotNow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ORANGE,
    borderWidth: 3,
    borderColor: WHITE,
  },
  status: {
    marginTop: 14,
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
  },
  hint: {
    marginTop: 3,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 15,
  },
  btnGhost: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  btnWhite: {
    backgroundColor: WHITE,
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
});
