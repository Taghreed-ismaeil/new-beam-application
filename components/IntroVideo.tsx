import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated, AppState, Pressable, StyleSheet } from "react-native";

import { preloadCustomerContent } from "@/lib/preload";

const introVideo = require("@/assets/video/intro.mp4");

// The clip is ~10s; if playback stalls or errors we still let the user in.
const FAILSAFE_MS = 15000;
// If the first frame hasn't rendered by then, drop the splash anyway rather than hang.
const SPLASH_MAX_MS = 3000;
// The clip's first frame is this light grey — matching it means no flash between
// the native splash and the video.
const INTRO_BG = "#EEEDF0";

let splashHidden = false;
function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  SplashScreen.hideAsync().catch(() => {});
}

/**
 * Full-screen intro clip shown once on app launch, layered above the whole
 * app (including the bottom tab bar). The native splash stays up until the
 * clip's first frame is on screen, so the video starts the instant the splash
 * goes away. Fades out when the video ends, when the user taps it, or after
 * FAILSAFE_MS.
 */
// The intro is for the customer app — staff opening the admin panel skip it.
// Decided once from the route the app was launched on.
export default function IntroVideo() {
  const pathname = usePathname();
  const [isAdmin] = useState(() => pathname.startsWith("/admin"));
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  // Every time the app is reopened from the background the intro plays again;
  // bumping the key remounts the player so it starts from the first frame.
  const [runId, setRunId] = useState(isAdmin ? -1 : 0);
  useEffect(() => {
    let wasBackground = false;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") wasBackground = true;
      else if (state === "active" && wasBackground) {
        wasBackground = false;
        if (!pathRef.current.startsWith("/admin")) setRunId((n) => Math.max(n, 0) + 1);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isAdmin) hideSplash();
  }, [isAdmin]);

  if (runId < 0) return null;
  return <IntroVideoPlayer key={runId} />;
}

function IntroVideoPlayer() {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const finishing = useRef(false);

  const player = useVideoPlayer(introVideo, (p) => {
    p.loop = false;
    p.play();
  });

  const finish = () => {
    if (finishing.current) return;
    finishing.current = true;
    hideSplash();
    Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      player.pause();
      setVisible(false);
    });
  };

  useEventListener(player, "playToEnd", finish);
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") finish();
  });

  useEffect(() => {
    // The intro is ~10s of idle time — use it to warm the menu data + image caches.
    preloadCustomerContent();
    const splashTimer = setTimeout(hideSplash, SPLASH_MAX_MS);
    const failsafe = setTimeout(finish, FAILSAFE_MS);
    return () => {
      clearTimeout(splashTimer);
      clearTimeout(failsafe);
    };
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
          onFirstFrameRender={hideSplash}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: INTRO_BG,
    zIndex: 9999,
    elevation: 9999,
  },
});
