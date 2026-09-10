import BackButton from "@/components/BackButton";
import QrScanner from "@/components/QrScanner";
import RarityCelebration from "@/components/RarityCelebration";
import TileImage from "@/components/TileImage";
import { apiRequest, imageUrl } from "@/lib/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Rarity QR codes are real loyalty scans underneath — the backend maps each
// one to that item's real qrToken/qrGroupToken (RARITY_TOKEN_MAP in
// backend/src/routes/loyalty.ts, keep the two in sync) and reveals 1/2/3
// pieces in a single /api/loyalty/scan call. A "rare" or "super rare"
// sticker is still printed on exactly one physical meal, so it only costs
// one purchase credit — it's just a luckier scan, not extra purchases.
// Every tier opens the same celebration card (see RarityCelebration) so the
// customer always lands somewhere consistent, then Continue sends them back
// to the Gifts tab to keep collecting. The sandwich group still asks the
// customer which sandwich they bought (same picker the app already uses).
// itemName + tier per rarity token, purely for the celebration card's display —
// the actual item lookup and reveal count are resolved server-side (see
// RARITY_TOKEN_MAP in backend/src/routes/loyalty.ts, keep the two in sync).
const RARITY_TOKEN_LOOKUP = {
  PIZZA_QR_NORMAL: { itemName: "Pizza 🍕", tier: "normal" },
  PIZZA_QR_RARE: { itemName: "Pizza 🍕", tier: "rare" },
  PIZZA_QR_SUPER: { itemName: "Pizza 🍕", tier: "super" },
  SHAWARMA_QR_NORMAL: { itemName: "Shawarma 🌯", tier: "normal" },
  SHAWARMA_QR_RARE: { itemName: "Shawarma 🌯", tier: "rare" },
  SHAWARMA_QR_SUPER: { itemName: "Shawarma 🌯", tier: "super" },
  BURGER_QR_NORMAL: { itemName: "Burger 🍔", tier: "normal" },
  BURGER_QR_RARE: { itemName: "Burger 🍔", tier: "rare" },
  BURGER_QR_SUPER: { itemName: "Burger 🍔", tier: "super" },
  SANDWICH_QR_NORMAL: { itemName: "Sandwiches 🥪", tier: "normal" },
  SANDWICH_QR_RARE: { itemName: "Sandwiches 🥪", tier: "rare" },
  SANDWICH_QR_SUPER: { itemName: "Sandwiches 🥪", tier: "super" },

  GREEK_SALAD_QR_NORMAL: { itemName: "Greek Salad 🥗", tier: "normal" },
  GREEK_SALAD_QR_RARE: { itemName: "Greek Salad 🥗", tier: "rare" },
  GREEK_SALAD_QR_SUPER: { itemName: "Greek Salad 🥗", tier: "super" },
  ARUGULA_SALAD_QR_NORMAL: { itemName: "Arugula Salad 🥬", tier: "normal" },
  ARUGULA_SALAD_QR_RARE: { itemName: "Arugula Salad 🥬", tier: "rare" },
  ARUGULA_SALAD_QR_SUPER: { itemName: "Arugula Salad 🥬", tier: "super" },
  CAESAR_SALAD_QR_NORMAL: { itemName: "Caesar Salad 🥗", tier: "normal" },
  CAESAR_SALAD_QR_RARE: { itemName: "Caesar Salad 🥗", tier: "rare" },
  CAESAR_SALAD_QR_SUPER: { itemName: "Caesar Salad 🥗", tier: "super" },
  SHAWARMA_SALAD_QR_NORMAL: { itemName: "Shawarma Salad 🌯", tier: "normal" },
  SHAWARMA_SALAD_QR_RARE: { itemName: "Shawarma Salad 🌯", tier: "rare" },
  SHAWARMA_SALAD_QR_SUPER: { itemName: "Shawarma Salad 🌯", tier: "super" },
  FATTOUSH_QR_NORMAL: { itemName: "Fattoush 🥗", tier: "normal" },
  FATTOUSH_QR_RARE: { itemName: "Fattoush 🥗", tier: "rare" },
  FATTOUSH_QR_SUPER: { itemName: "Fattoush 🥗", tier: "super" },
  QUINOA_SALAD_QR_NORMAL: { itemName: "Quinoa Salad 🌾", tier: "normal" },
  QUINOA_SALAD_QR_RARE: { itemName: "Quinoa Salad 🌾", tier: "rare" },
  QUINOA_SALAD_QR_SUPER: { itemName: "Quinoa Salad 🌾", tier: "super" },
};

// Same idea for the prize wheel — one dedicated QR code, no backend call,
// just jumps straight into the wheel screen.
const WHEEL_TOKEN = "LUCKY_WHEEL_QR";

export default function LoyaltyScanScreen() {
  const [result, setResult] = useState(null);
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeRarity, setActiveRarity] = useState(null);
  // Set only while waiting on the "which sandwich did you buy?" picker that a
  // rarity scan triggered — remembers the tier so the follow-up call (once the
  // customer picks an item) still applies the right reveal count.
  const [pendingRarity, setPendingRarity] = useState(null);

  // Turns a scan result into the right screen: every successful tier —
  // "normal" included — opens the same celebration card (RarityCelebration
  // renders "normal" as a plain reveal, no confetti/badge/haptics). Only a
  // failed scan falls back to the plain error card.
  function applyRarityResult(match, res) {
    if (!res?.accepted) {
      setResult(
        res ?? { accepted: false, message: "Something went wrong, try again" },
      );
    } else {
      setActiveRarity({
        tier: match.tier,
        itemName: match.itemName,
        apiResult: res,
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
        // The rarity token goes straight to the backend — it resolves the
        // real item and reveal count itself (RARITY_TOKEN_MAP), so this is
        // always exactly one call, one purchase credit, regardless of tier.
        const res = await apiRequest("/api/loyalty/scan", {
          method: "POST",
          body: { token },
        });
        if (res.needsSelection) {
          setPendingRarity({ ...match, token });
          setOptions(res.options);
          setBusy(false);
          return;
        }
        applyRarityResult(match, res);
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
        const res = await apiRequest("/api/loyalty/scan", {
          method: "POST",
          body: { selectedItemId, token: match.token },
        });
        applyRarityResult(match, res);
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

  // Continue always sends the customer back to the Gifts (loyalty) tab, not
  // to the item's menu page — they're here to keep collecting, not to order.
  function backToGifts() {
    setActiveRarity(null);
    router.replace("/loyalty");
  }

  if (activeRarity) {
    return (
      <RarityCelebration
        tier={activeRarity.tier}
        itemName={activeRarity.itemName}
        apiResult={activeRarity.apiResult}
        onContinue={backToGifts}
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
