import { useId, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from "react-native-svg";
import { imageUrl } from "@/lib/api-client";
import { PUZZLE_PIECES, puzzlePaths, revealOrder } from "@/lib/puzzle";

// Gift tile drawn as a jigsaw: the grey photo underneath, and the colour photo
// showing through only the pieces this customer has revealed so far.
export default function TileImage({ itemId, grayImage, revealedCount, completed, size = 220 }) {
  const clipId = `pz${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const paths = useMemo(() => puzzlePaths(size), [size]);
  const order = useMemo(() => revealOrder(itemId), [itemId]);

  const shown = completed ? PUZZLE_PIECES : Math.min(revealedCount ?? 0, PUZZLE_PIECES);
  const revealed = order.slice(0, shown);
  // grayImage already carries the ?v= cache-buster, so the colour URL inherits it.
  const colorImage = grayImage?.replace("gray.png", "color.png");
  const stroke = Math.max(1, size / 150);

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <SvgImage href={{ uri: imageUrl(grayImage) }} width={size} height={size} preserveAspectRatio="xMidYMid slice" />

        {revealed.length > 0 && (
          <>
            <Defs>
              <ClipPath id={clipId}>
                {revealed.map((i) => (
                  <Path key={i} d={paths[i]} />
                ))}
              </ClipPath>
            </Defs>
            <SvgImage
              href={{ uri: imageUrl(colorImage) }}
              width={size}
              height={size}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            />
          </>
        )}

        {paths.map((d, i) => (
          <Path key={`s${i}`} d={d} fill="none" stroke="rgba(23,32,31,0.28)" strokeWidth={stroke * 2.2} />
        ))}
        {paths.map((d, i) => (
          <Path key={`h${i}`} d={d} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={stroke} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 16, overflow: "hidden", backgroundColor: "#eee" },
});
