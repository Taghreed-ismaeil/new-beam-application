import { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Native (real device / Expo Go): expo-camera's live barcode scanner.
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

  return (
    <CameraPermissionGate cameraModule={cameraModule} onDecode={onDecode} />
  );
}

function CameraPermissionGate({ cameraModule, onDecode }) {
  const { CameraView, useCameraPermissions } = cameraModule;
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain &&
      !requesting
    ) {
      setRequesting(true);
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.box}>
        <Text style={styles.hint}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <Text style={styles.hint}>
          {permission.canAskAgain
            ? "We need camera access"
            : "Camera access was denied in device settings"}
        </Text>
        {permission.canAskAgain ? (
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Allow camera</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>
            Go to device Settings → Expo Go → enable camera access
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.cameraBox}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          onDecode(data);
        }}
      />
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
  cameraBox: {
    height: 280,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
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
