import { useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

// Free map: Leaflet + OpenStreetMap tiles rendered inside a WebView, no API
// key or billing account needed. The HTML page is built once at mount (using
// only the initial center/zoom/interactive flag) and everything after that —
// moving markers, fitting bounds — happens by injecting JS into the already-
// loaded page, so live location updates don't reload/flash the map.
function buildHtml(center, zoom, interactive) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;}.leaflet-control-attribution{font-size:9px;}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: true }).setView([${center.lat}, ${center.lng}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  var markers = {};

  function setMarkers(list) {
    var seen = {};
    list.forEach(function (m) {
      seen[m.id] = true;
      if (markers[m.id]) {
        markers[m.id].setLatLng([m.lat, m.lng]);
      } else {
        var icon = L.divIcon({
          className: '',
          html: '<div style="background:' + m.color + ';width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        markers[m.id] = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
      }
      if (m.label) markers[m.id].bindTooltip(m.label, { permanent: true, direction: 'top', offset: [0, -12] });
    });
    Object.keys(markers).forEach(function (id) {
      if (!seen[id]) { map.removeLayer(markers[id]); delete markers[id]; }
    });
  }

  function fitToMarkers() {
    var latlngs = Object.keys(markers).map(function (id) { return markers[id].getLatLng(); });
    if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], ${zoom});
    }
  }

  ${
    interactive
      ? `
  map.on('click', function (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng }));
  });
  `
      : ""
  }

  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
</script>
</body>
</html>`;
}

export default function LeafletMap({
  markers = [],
  center,
  zoom = 15,
  interactive = false,
  onPick,
  fitToMarkers = false,
  style,
}) {
  const webviewRef = useRef(null);
  const readyRef = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildHtml(center, zoom, interactive), []);

  function pushMarkers() {
    const js = `setMarkers(${JSON.stringify(markers)}); ${fitToMarkers ? "fitToMarkers();" : ""} true;`;
    webviewRef.current?.injectJavaScript(js);
  }

  useEffect(() => {
    if (readyRef.current) pushMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markers)]);

  function handleMessage(event) {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (data.type === "ready") {
      readyRef.current = true;
      pushMarkers();
    } else if (data.type === "pick") {
      onPick?.(data.lat, data.lng);
    }
  }

  // react-native-webview only supports iOS/Android/macOS/Windows — Expo Web
  // has no WebView backend at all, so this is the app's real behavior there,
  // not a bug to fix, just something to show cleanly instead of the raw
  // "does not support this platform" error.
  if (Platform.OS === "web") {
    return (
      <View style={[styles.webFallback, style]}>
        <Text style={styles.webFallbackText}>
          Map view is available in the Beem app on your phone
        </Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webviewRef}
      originWhitelist={["*"]}
      source={{ html }}
      style={style}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

const styles = StyleSheet.create({
  webFallback: {
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  webFallbackText: { color: "#999", textAlign: "center", fontSize: 13 },
});
