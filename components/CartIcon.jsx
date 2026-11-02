import Svg, { Circle, Path } from "react-native-svg";

/* =========================================================
   CART ICON
   The app's shopping trolley. Two looks:
   - solid (default): an orange basket with a lighter rim, white
     slats, a dark handle and wheels — for the cart buttons.
   - line: drawn in one colour for the tab bar; `filled` paints
     the basket in when its tab is the open one.
========================================================= */

const ORANGE = "#FC4A14";
const ORANGE_DARK = "#C93A10";
const ORANGE_LIGHT = "#FF7D52";
const WHITE = "#FFFFFF";

// shared shapes (48×48 box)
const HANDLE = "M4.5 9.5h4.6c1.2 0 2.2.8 2.5 1.9l4.6 18.1";
const BASKET =
  "M13.1 14.5h29.1c1.6 0 2.8 1.6 2.3 3.2l-3.3 11a3.4 3.4 0 0 1-3.3 2.4H17.6a3.4 3.4 0 0 1-3.3-2.6z";
const RIM = "M13.1 14.5h29.1c1.6 0 2.8 1.6 2.3 3.2l-.5 1.6H14.3z";
const RAIL = "M16.2 31.1l-.8 3.1a1.7 1.7 0 0 0 1.7 2.1h21.4";
const SLATS = "M22.5 19.5v7.6M29.3 19.5v7.6M36.1 19.5v7.6";

export default function CartIcon({ size = 28, pressed = false, variant = "solid", color = ORANGE, filled = false }) {
  if (variant === "line") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path d={HANDLE} fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
        <Path
          d={BASKET}
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth={3.4}
          strokeLinejoin="round"
        />
        {filled && <Path d={SLATS} stroke={WHITE} strokeWidth={2.4} strokeLinecap="round" />}
        <Path d={RAIL} fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={19.5} cy={41.3} r={3.1} fill={color} />
        <Circle cx={35.5} cy={41.3} r={3.1} fill={color} />
      </Svg>
    );
  }

  const body = pressed ? ORANGE_DARK : ORANGE;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* handle and base rail */}
      <Path d={HANDLE} fill="none" stroke={ORANGE_DARK} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={RAIL} fill="none" stroke={ORANGE_DARK} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      {/* basket, with a lighter rim along the top */}
      <Path d={BASKET} fill={body} />
      <Path d={RIM} fill={pressed ? ORANGE : ORANGE_LIGHT} />
      {/* slats */}
      <Path d={SLATS} stroke={WHITE} strokeWidth={2.4} strokeLinecap="round" opacity={0.92} />
      {/* wheels */}
      <Circle cx={19.5} cy={41.3} r={3.6} fill={ORANGE_DARK} />
      <Circle cx={35.5} cy={41.3} r={3.6} fill={ORANGE_DARK} />
      <Circle cx={19.5} cy={41.3} r={1.3} fill={WHITE} />
      <Circle cx={35.5} cy={41.3} r={1.3} fill={WHITE} />
    </Svg>
  );
}
