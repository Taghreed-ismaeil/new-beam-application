import { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Native (real device / Expo Go): opens the phone's own system camera app to take a still photo,
// then decodes it with expo-camera's scanFromURLAsync — Expo Go's live in-app preview has been
// an unreliable black-screen trouble spot (a native-side bug frozen into the Expo Go binary).
// Web (Expo web): an image upload decoded with jsQR, since the dev sandbox has no camera access.

export default function QrScanner({ onDecode }) {
  if (Platform.OS === "web") {
    return <WebUploadScanner onDecode={onDecode} />;
  }
  return <NativeCameraScanner onDecode={onDecode} />;
}

function NativeCameraScanner({ onDecode }) {
  let cameraModule;
  let loadError = "";
  try {
    cameraModule = require("expo-camera");
  } catch (e) {
    loadError = e?.message ?? "Could not load the camera library";
  }

  if (loadError) {
    return (
      <View style={styles.box}>
        <Text style={styles.hint}>Couldn't load the camera</Text>
        <Text style={styles.error}>{loadError}</Text>
      </View>
    );
  }

  return <PhotoScanner cameraModule={cameraModule} onDecode={onDecode} />;
}

// Opens the phone's own system camera app (always reliable, no custom preview to break),
// then decodes the still photo with expo-camera's scanFromURLAsync.
function PhotoScanner({ cameraModule, onDecode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const launchedRef = useRef(false);

  async function takeAndScan() {
    setError("");
    setBusy(true);
    let stage = "permission";
    try {
      const ImagePicker = require("expo-image-picker");
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError(
          perm.canAskAgain
            ? "Camera access was denied"
            : "Camera access was denied — enable it in device Settings → Expo Go",
        );
        return;
      }

      stage = "camera";
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]) return;

      // The photo comes straight off the system camera, which on iOS can be HEIC and
      // full sensor resolution — scanFromURLAsync misses the code more often on those.
      // Normalizing to a resized JPEG first makes the scan reliable.
      stage = "resize";
      const ImageManipulator = require("expo-image-manipulator");
      const normalized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );

      stage = "decode";
      const matches = await cameraModule.scanFromURLAsync(normalized.uri, [
        "qr",
      ]);
      if (matches?.[0]?.data) {
        onDecode(matches[0].data);
      } else {
        setError("Couldn't find a QR code in that photo, try again");
      }
    } catch (e) {
      console.error(`[QrScanner:${stage}]`, e);
      setError(
        `Something went wrong (${stage}): ${e?.message || e?.code || String(e)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  // Opens the camera automatically the moment this screen mounts, so
  // tapping "Scan QR" goes straight into the system camera with no extra tap.
  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;
    takeAndScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.box}>
      {busy ? (
        <Text style={styles.hint}>Opening camera...</Text>
      ) : (
        <>
          <Text style={styles.hint}>📷 Ready to scan a QR code</Text>
          <TouchableOpacity style={styles.btn} onPress={takeAndScan}>
            <Text style={styles.btnText}>Open camera</Text>
          </TouchableOpacity>
        </>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function WebUploadScanner({ onDecode }) {
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const jsQR = require("jsqr");
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      URL.revokeObjectURL(url);
      if (code?.data) {
        setError("");
        onDecode(code.data);
      } else {
        setError("Couldn't find a QR code in that image, try a clearer one");
      }
    };
    image.src = url;
  }

  return (
    <View style={styles.box}>
      <Text style={styles.hint}>
        📷 Live camera isn't available on web — upload a QR photo
      </Text>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ marginTop: 12 }}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 280,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  hint: { color: "#fff", textAlign: "center" },
  error: { color: "#ff8080", marginTop: 8, textAlign: "center" },
  btn: {
    marginTop: 12,
    backgroundColor: "#ff8c00",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
