import BackButton from "@/components/BackButton";
import QrScanner from "@/components/QrScanner";
import RarityCelebration from "@/components/RarityCelebration";
import TileImage from "@/components/TileImage";
import { apiRequest, imageUrl } from "@/lib/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Rarity QR codes are real loyalty scans underneath — each one is mapped
// to that item's real qrToken/qrGroupToken from the database. Scanning a
// "rare" or "super rare" sticker just calls the normal /api/loyalty/scan
// endpoint 2 or 3 times in a row instead of once, so it genuinely reveals
// that many extra pieces of the real collectible art (and can genuinely
// complete the collection and mint a real voucher). "Normal" reveals one
// piece exactly like scanning the item's real QR directly — no celebration,
// just the plain reveal. The sandwich group still asks the customer which
// sandwich they bought (same picker the app already uses); rarity scans
// just remember that answer and re-use it for the extra reveals instead of
// asking again.
const RARITY_ITEMS = [
  {
    itemId: 1,
    itemName: "Pizza 🍕",
    route: "/menu-food/shawerma",
    realToken: "MENU_f12908d6",
    tokens: {
      PIZZA_QR_NORMAL: { tier: "normal", reveals: 1 },
      PIZZA_QR_RARE: { tier: "rare", reveals: 2 },
      PIZZA_QR_SUPER: { tier: "super", reveals: 3 },
    },
  },
  {
    itemId: 2,
    itemName: "Shawarma 🌯",
    route: "/menu-food/shawerma",
    realToken: "MENU_d3051fc2",
    tokens: {
      SHAWARMA_QR_NORMAL: { tier: "normal", reveals: 1 },
      SHAWARMA_QR_RARE: { tier: "rare", reveals: 2 },
      SHAWARMA_QR_SUPER: { tier: "super", reveals: 3 },
    },
  },
  {
    itemId: 3,
    itemName: "Burger 🍔",
    route: "/menu-food/burger",
    realToken: "MENU_72952981",
    tokens: {
      BURGER_QR_NORMAL: { tier: "normal", reveals: 1 },
      BURGER_QR_RARE: { tier: "rare", reveals: 2 },
      BURGER_QR_SUPER: { tier: "super", reveals: 3 },
    },
  },
  {
    itemId: 20,
    itemName: "Sandwiches 🥪",
    route: "/menu-food/sandwiches",
    realToken: "SANDWICH_GROUP_e40422b2",
    tokens: {
      SANDWICH_QR_NORMAL: { tier: "normal", reveals: 1 },
      SANDWICH_QR_RARE: { tier: "rare", reveals: 2 },
      SANDWICH_QR_SUPER: { tier: "super", reveals: 3 },
    },
  },
];

// token -> { item, tier, reveals } lookup built once from the list above
const RARITY_TOKEN_LOOKUP = RARITY_ITEMS.reduce((map, item) => {
  for (const [token, cfg] of Object.entries(item.tokens))
    map[token] = { item, ...cfg };
  return map;
}, {});

// Same idea for the prize wheel — one dedicated QR code, no backend call,
// just jumps straight into the wheel screen.
const WHEEL_TOKEN = "LUCKY_WHEEL_QR";

export default function LoyaltyScanScreen() {
  const [result, setResult] = useState(null);
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeRarity, setActiveRarity] = useState(null);
  // Set only while waiting on the "which sandwich did you buy?" picker that
  // a rarity scan triggered — remembers how many total reveals are owed.
  const [pendingRarity, setPendingRarity] = useState(null);

  // Turns a completed reveal (possibly the last of several) into the right
  // screen: plain result for "normal" tier or any failure, celebration
  // overlay for "rare"/"super".
  function applyRarityResult(match, lastRes) {
    if (match.tier === "normal" || !lastRes?.accepted) {
      setResult(
        lastRes ?? {
          accepted: false,
          message: "Something went wrong, try again",
        },
      );
    } else {
      setActiveRarity({
        tier: match.tier,
        item: match.item,
        apiResult: lastRes,
      });
    }
  }

  async function onDecode(token) {
    if (token === WHEEL_TOKEN) {
      router.push("/loyalty/wheel");
      return;
    }

    const match = RARITY_TOKEN_LOOKUP[token];
    if (match) {
      setBusy(true);
      try {
        const first = await apiRequest("/api/loyalty/scan", {
          method: "POST",
          body: { token: match.item.realToken },
        });
        if (first.needsSelection) {
          // pause here — the picker below asks once, then the extra
          // reveals (if any) replay automatically with that same answer
          setPendingRarity(match);
          setOptions(first.options);
          setBusy(false);
          return;
        }
        let lastRes = first;
        for (let i = 1; i < match.reveals; i++) {
          if (!lastRes?.accepted) break;
          lastRes = await apiRequest("/api/loyalty/scan", {
            method: "POST",
            body: { token: match.item.realToken },
          });
        }
        applyRarityResult(match, lastRes);
      } catch {
        setResult({
          accepted: false,
          message: "Something went wrong, try again",
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const res = await apiRequest("/api/loyalty/scan", {
        method: "POST",
        body: { token },
      });
      if (res.needsSelection) {
        setOptions(res.options);
      } else {
        setResult(res);
      }
    } catch {
      setResult({
        accepted: false,
        message: "Something went wrong, try again",
      });
    } finally {
      setBusy(false);
    }
  }

  async function chooseOption(selectedItemId) {
    setOptions(null);

    if (pendingRarity) {
      const match = pendingRarity;
      setPendingRarity(null);
      setBusy(true);
      try {
        let lastRes = await apiRequest("/api/loyalty/scan", {
          method: "POST",
          body: { selectedItemId },
        });
        for (let i = 1; i < match.reveals; i++) {
          if (!lastRes?.accepted) break;
          const again = await apiRequest("/api/loyalty/scan", {
            method: "POST",
            body: { token: match.item.realToken },
          });
          lastRes = again.needsSelection
            ? await apiRequest("/api/loyalty/scan", {
                method: "POST",
                body: { selectedItemId },
              })
            : again;
        }
        applyRarityResult(match, lastRes);
      } catch {
        setResult({
          accepted: false,
          message: "Something went wrong, try again",
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const res = await apiRequest("/api/loyalty/scan", {
        method: "POST",
        body: { selectedItemId },
      });
      setResult(res);
    } catch {
      setResult({
        accepted: false,
        message: "Something went wrong, try again",
      });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setOptions(null);
    setPendingRarity(null);
  }

  function goToRarityItem() {
    const route = activeRarity.item.route;
    setActiveRarity(null);
    router.push(route);
  }

  if (activeRarity) {
    return (
      <RarityCelebration
        tier={activeRarity.tier}
        itemName={activeRarity.item.itemName}
        apiResult={activeRarity.apiResult}
        onContinue={goToRarityItem}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <BackButton />
      {!result && !options && !busy && <QrScanner onDecode={onDecode} />}
      {busy && <Text style={styles.muted}>Checking...</Text>}

      {options && (
        <View style={styles.resultCard}>
          <Text style={styles.question}>Which item did you buy?</Text>
          <View style={styles.optionsGrid}>
            {options.map((o) => (
              <TouchableOpacity
                key={o.id}
                style={styles.optionCard}
                onPress={() => chooseOption(o.id)}
              >
                <Image
                  source={{ uri: imageUrl(o.grayImage) }}
                  style={styles.optionImage}
                />
                <Text style={styles.optionName}>{o.nameEn || o.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={reset}>
            <Text style={styles.link}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <View style={styles.resultCard}>
          {result.item && (
            <TileImage
              itemId={result.item.id}
              grayImage={result.item.grayImage}
              layers={result.item.layers}
              revealedCount={result.revealedCount ?? 0}
              updatedAt={result.item.updatedAt}
              size={200}
            />
          )}
          {result.accepted ? (
            <>
              <Text style={styles.success}>A new piece revealed! 🎨</Text>
              {result.completed && (
                <View style={styles.voucherBox}>
                  <Text style={styles.voucherTitle}>🎉 Congrats! You won</Text>
                  <Text style={styles.voucherReward}>
                    {result.item.rewardValue}
                  </Text>
                  <Text style={styles.voucherCode}>
                    Redeem code: {result.voucher.code}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.error}>{result.message}</Text>
          )}
          <TouchableOpacity style={styles.btn} onPress={reset}>
            <Text style={styles.btnText}>Scan another QR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", padding: 20, paddingTop: 60 },
  muted: { color: "#999", textAlign: "center", marginTop: 40 },
  resultCard: { alignItems: "center", gap: 10 },
  question: { fontSize: 17, fontWeight: "800", color: "#111" },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  optionCard: { width: 120, alignItems: "center", gap: 6 },
  optionImage: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: "#eee",
  },
  optionName: { fontWeight: "700", color: "#111" },
  success: {
    color: "#2f9e5b",
    fontWeight: "800",
    fontSize: 15,
    textAlign: "center",
  },
  error: { color: "#c0392b", fontWeight: "800", textAlign: "center" },
  voucherBox: {
    backgroundColor: "#e5f5ec",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    alignItems: "center",
    gap: 4,
  },
  voucherTitle: { fontWeight: "800", color: "#2f9e5b" },
  voucherReward: { fontWeight: "800", fontSize: 17, color: "#2f9e5b" },
  voucherCode: {
    fontSize: 18,
    letterSpacing: 2,
    color: "#2f9e5b",
    fontWeight: "800",
  },
  btn: {
    backgroundColor: "#ff8c00",
    borderRadius: 40,
    padding: 14,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "800" },
  link: { color: "#999", marginTop: 8 },
});
