import BackButton from "@/components/BackButton";
import LeafletMap from "@/components/LeafletMap";
import { setPendingDeliveryLocation } from "@/lib/pendingLocation";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Fallback center (Amman) for when GPS permission is denied and the customer
// hasn't picked a point yet — better than defaulting to (0,0) in the ocean.
const AMMAN = { lat: 31.9539, lng: 35.9106 };

export default function DeliveryLocationScreen() {
  const params = useLocalSearchParams();
  const initialLat = params.lat ? Number(params.lat) : null;
  const initialLng = params.lng ? Number(params.lng) : null;

  const [center] = useState(() =>
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : AMMAN,
  );
  const [picked, setPicked] = useState(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  );
  const [address, setAddress] = useState(params.address ?? "");
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const geocodeSeq = useRef(0);

  useEffect(() => {
    if (!initialLat) useCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reverseGeocode(lat, lng) {
    const seq = ++geocodeSeq.current;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`,
        { headers: { "Accept-Language": "ar,en" } },
      );
      const data = await res.json();
      if (seq === geocodeSeq.current && data?.display_name) {
        setAddress(data.display_name);
      }
    } catch {
      // reverse geocoding is only a convenience prefill — leave the address field as typed on failure
    } finally {
      if (seq === geocodeSeq.current) setGeocoding(false);
    }
  }

  function onPick(lat, lng) {
    setPicked({ lat, lng });
    reverseGeocode(lat, lng);
  }

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      onPick(pos.coords.latitude, pos.coords.longitude);
    } catch {
      // GPS unavailable — customer can still tap the map manually
    } finally {
      setLocating(false);
    }
  }

  function confirm() {
    if (!picked) return;
    setPendingDeliveryLocation({
      lat: picked.lat,
      lng: picked.lng,
      address: address.trim(),
    });
    router.back();
  }

  return (
    <View style={styles.screen}>
      <LeafletMap
        center={center}
        zoom={15}
        interactive
        onPick={onPick}
        markers={
          picked
            ? [
                {
                  id: "picked",
                  lat: picked.lat,
                  lng: picked.lng,
                  color: "#ED5529",
                },
              ]
            : []
        }
        style={styles.map}
      />
      <BackButton />

      <TouchableOpacity
        style={styles.currentLocationBtn}
        onPress={useCurrentLocation}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator color="#ED5529" />
        ) : (
          <Ionicons name="locate" size={22} color="#ED5529" />
        )}
      </TouchableOpacity>

      <View style={styles.sheet}>
        <Text style={styles.hint}>
          {picked
            ? "Tap the map to adjust the pin"
            : "Tap the map to set your delivery location"}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Delivery address details (building, floor...)"
          value={address}
          onChangeText={setAddress}
          multiline
        />
        {geocoding && <Text style={styles.geocoding}>Looking up address…</Text>}
        <TouchableOpacity
          style={[styles.confirmBtn, !picked && styles.confirmBtnDisabled]}
          onPress={confirm}
          disabled={!picked}
        >
          <Text style={styles.confirmBtnText}>Confirm location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },
  currentLocationBtn: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 30,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  hint: { color: "#999", fontSize: 13, marginBottom: 10, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fafafa",
    minHeight: 50,
    textAlignVertical: "top",
  },
  geocoding: { color: "#999", fontSize: 12, marginTop: 6 },
  confirmBtn: {
    backgroundColor: "#ED5529",
    borderRadius: 40,
    padding: 15,
    alignItems: "center",
    marginTop: 14,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
