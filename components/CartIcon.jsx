import Svg, { Circle, Path } from "react-native-svg";

/* =========================================================
   CART ICON
   The app's shopping bag: a solid orange bag with a darker
   handle, a lighter rim and a white smile — clearer than the
   plain icon-font bag at every size.
========================================================= */

const ORANGE = "#FC4A14";
const ORANGE_DARK = "#C93A10";
const ORANGE_LIGHT = "#FF7D52";
const WHITE = "#FFFFFF";

export default function CartIcon({ size = 28, pressed = false }) {
  const body = pressed ? ORANGE_DARK : ORANGE;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* handle */}
      <Path
        d="M16.5 21V14.5a7.5 7.5 0 0 1 15 0V21"
        fill="none"
        stroke={ORANGE_DARK}
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      {/* bag */}
      <Path
        d="M10.2 16.5h27.6a2.6 2.6 0 0 1 2.6 2.8l-1.7 21a4.6 4.6 0 0 1-4.6 4.2H13.9a4.6 4.6 0 0 1-4.6-4.2l-1.7-21a2.6 2.6 0 0 1 2.6-2.8z"
        fill={body}
      />
      {/* lighter rim along the top */}
      <Path
        d="M10.2 16.5h27.6a2.6 2.6 0 0 1 2.6 2.8l-.2 2.4H7.8l-.2-2.4a2.6 2.6 0 0 1 2.6-2.8z"
        fill={pressed ? ORANGE : ORANGE_LIGHT}
      />
      {/* handle holes */}
      <Circle cx={16.5} cy={21} r={1.9} fill={WHITE} />
      <Circle cx={31.5} cy={21} r={1.9} fill={WHITE} />
      {/* smile */}
      <Path
        d="M18 30.5c3.4 4 8.6 4 12 0"
        fill="none"
        stroke={WHITE}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
