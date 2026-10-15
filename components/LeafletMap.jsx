import { createElement, useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
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
  // On web the page runs in an iframe instead of a WebView — route its
  // messages to the parent window the same way.
  if (!window.ReactNativeWebView) {
    window.ReactNativeWebView = {
      postMessage: function (data) { window.parent.postMessage({ __leaflet: true, data: data }, '*'); }
    };
  }
</script>
<script>
  // zoom buttons only on maps the user actually works with (e.g. picking a
  // delivery spot) — a read-only preview stays clean
  var map = L.map('map', { zoomControl: ${interactive} }).setView([${center.lat}, ${center.lng}], ${zoom});
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

  const iframeRef = useRef(null);

  function pushMarkers() {
    const js = `setMarkers(${JSON.stringify(markers)}); ${fitToMarkers ? "fitToMarkers();" : ""} true;`;
    if (Platform.OS === "web") {
      // srcDoc iframes share our origin, so we can call into the page directly
      try {
        iframeRef.current?.contentWindow?.eval(js);
      } catch {
        // iframe not ready yet — the 'ready' message will push again
      }
      return;
    }
    webviewRef.current?.injectJavaScript(js);
  }

  // Web: listen for messages coming out of this map's iframe.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    function onWindowMessage(e) {
      if (e.source !== iframeRef.current?.contentWindow || !e.data?.__leaflet) return;
      handleMessage({ nativeEvent: { data: e.data.data } });
    }
    window.addEventListener("message", onWindowMessage);
    return () => window.removeEventListener("message", onWindowMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // react-native-webview has no web backend, so on Expo Web the same Leaflet
  // page is rendered in a plain iframe instead.
  if (Platform.OS === "web") {
    return (
      <View style={[styles.webBox, style]}>
        {createElement("iframe", {
          ref: iframeRef,
          srcDoc: html,
          title: "map",
          style: { border: 0, width: "100%", height: "100%", display: "block" },
        })}
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
  webBox: {
    overflow: "hidden",
  },
});
