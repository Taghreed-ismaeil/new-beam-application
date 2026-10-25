import BackButton from "@/components/BackButton";
import QrScanner from "@/components/QrScanner";
import RarityCelebration from "@/components/RarityCelebration";
import GiftsBackdrop from "@/components/GiftsBackdrop";
import TileImage from "@/components/TileImage";
import { apiRequest, imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/lib/arabic-font";

// Rarity QR codes are real loyalty scans underneath — each one is mapped
// to that item's real qrToken/qrGroupToken from the database.
const RARITY_ITEMS = [
  {
    itemId: 21,
    itemName: "كبدة مع دبس رمان 🍖",
    realToken: "MENU_5b910645",
    tokens: {
      KABDA_QR_NORMAL: { tier: "normal", reveals: 1 },
      KABDA_QR_RARE: { tier: "rare", reveals: 3 },
      KABDA_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 22,
    itemName: "كبدة مع جبنة 🧀",
    realToken: "MENU_cb53f74a",
    tokens: {
      KABDA_CHEESE_QR_NORMAL: { tier: "normal", reveals: 1 },
      KABDA_CHEESE_QR_RARE: { tier: "rare", reveals: 3 },
      KABDA_CHEESE_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 23,
    itemName: "كبدة حارة 🌶️",
    realToken: "MENU_812fc437",
    tokens: {
      KABDA_SPICY_QR_NORMAL: { tier: "normal", reveals: 1 },
      KABDA_SPICY_QR_RARE: { tier: "rare", reveals: 3 },
      KABDA_SPICY_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 24,
    itemName: "كريسبي تشيكن برغر 🍗",
    realToken: "MENU_f1ba4c2d",
    tokens: {
      CRISPY_CHICKEN_QR_NORMAL: { tier: "normal", reveals: 1 },
      CRISPY_CHICKEN_QR_RARE: { tier: "rare", reveals: 3 },
      CRISPY_CHICKEN_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 25,
    itemName: "بيم برغر 🍔",
    realToken: "MENU_853261b7",
    tokens: {
      BEEM_BURGER_QR_NORMAL: { tier: "normal", reveals: 1 },
      BEEM_BURGER_QR_RARE: { tier: "rare", reveals: 3 },
      BEEM_BURGER_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 26,
    itemName: "ماكسيكان برغر 🌶️",
    realToken: "MENU_8fc8bfae",
    tokens: {
      MEXICAN_BURGER_QR_NORMAL: { tier: "normal", reveals: 1 },
      MEXICAN_BURGER_QR_RARE: { tier: "rare", reveals: 3 },
      MEXICAN_BURGER_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 27,
    itemName: "شاورما بالكريما 🌯",
    realToken: "MENU_654c22d7",
    tokens: {
      SHAWARMA_CREAM_QR_NORMAL: { tier: "normal", reveals: 1 },
      SHAWARMA_CREAM_QR_RARE: { tier: "rare", reveals: 3 },
      SHAWARMA_CREAM_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 28,
    itemName: "شاورما باربيكيو 🌯",
    realToken: "MENU_573543fd",
    tokens: {
      SHAWARMA_BBQ_QR_NORMAL: { tier: "normal", reveals: 1 },
      SHAWARMA_BBQ_QR_RARE: { tier: "rare", reveals: 3 },
      SHAWARMA_BBQ_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 29,
    itemName: "سيزون برغر 🍔",
    realToken: "MENU_ed0920ce",
    tokens: {
      SEASON_BURGER_QR_NORMAL: { tier: "normal", reveals: 1 },
      SEASON_BURGER_QR_RARE: { tier: "rare", reveals: 3 },
      SEASON_BURGER_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 30,
    itemName: "كلاسيك برغر 🍔",
    realToken: "MENU_81c5b1b6",
    tokens: {
      CLASSIC_BURGER_QR_NORMAL: { tier: "normal", reveals: 1 },
      CLASSIC_BURGER_QR_RARE: { tier: "rare", reveals: 3 },
      CLASSIC_BURGER_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 31,
    itemName: "حلوم ساندويش 🧀",
    realToken: "MENU_f3d6a074",
    tokens: {
      HALLOUMI_QR_NORMAL: { tier: "normal", reveals: 1 },
      HALLOUMI_QR_RARE: { tier: "rare", reveals: 3 },
      HALLOUMI_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 32,
    itemName: "مفركة ساندويش 🥔",
    realToken: "MENU_44cae0b6",
    tokens: {
      MAFRAKEH_QR_NORMAL: { tier: "normal", reveals: 1 },
      MAFRAKEH_QR_RARE: { tier: "rare", reveals: 3 },
      MAFRAKEH_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 33,
    itemName: "تندر 🍗",
    realToken: "MENU_ace08a48",
    tokens: {
      TENDER_QR_NORMAL: { tier: "normal", reveals: 1 },
      TENDER_QR_RARE: { tier: "rare", reveals: 3 },
      TENDER_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 34,
    itemName: "تيركي مع دجاج 🥪",
    realToken: "MENU_a2a9f9cf",
    tokens: {
      TURKEY_CHICKEN_QR_NORMAL: { tier: "normal", reveals: 1 },
      TURKEY_CHICKEN_QR_RARE: { tier: "rare", reveals: 3 },
      TURKEY_CHICKEN_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 35,
    itemName: "فاهيتا 🌮",
    realToken: "MENU_82e6dcf0",
    tokens: {
      FAHITA2_QR_NORMAL: { tier: "normal", reveals: 1 },
      FAHITA2_QR_RARE: { tier: "rare", reveals: 3 },
      FAHITA2_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 36,
    itemName: "بطاطا 🍟",
    realToken: "MENU_93ac2685",
    tokens: {
      FRIES_QR_NORMAL: { tier: "normal", reveals: 1 },
      FRIES_QR_RARE: { tier: "rare", reveals: 3 },
      FRIES_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 37,
    itemName: "دجاج بالزعتر 🌿",
    realToken: "MENU_373197b1",
    tokens: {
      ZAATAR_CHICKEN_QR_NORMAL: { tier: "normal", reveals: 1 },
      ZAATAR_CHICKEN_QR_RARE: { tier: "rare", reveals: 3 },
      ZAATAR_CHICKEN_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 38,
    itemName: "شاورما البيم 🌯",
    realToken: "MENU_c5a6d88d",
    tokens: {
      SHAWARMA_BEEM_QR_NORMAL: { tier: "normal", reveals: 1 },
      SHAWARMA_BEEM_QR_RARE: { tier: "rare", reveals: 3 },
      SHAWARMA_BEEM_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 101,
    itemName: "سلطة جريك 🥗",
    realToken: "MENU_2052e487",
    tokens: {
      GREEK_SALAD_QR_NORMAL: { tier: "normal", reveals: 1 },
      GREEK_SALAD_QR_RARE: { tier: "rare", reveals: 3 },
      GREEK_SALAD_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 102,
    itemName: "سلطة روكا 🥗",
    realToken: "MENU_eb8d00b5",
    tokens: {
      ARUGULA_SALAD_QR_NORMAL: { tier: "normal", reveals: 1 },
      ARUGULA_SALAD_QR_RARE: { tier: "rare", reveals: 3 },
      ARUGULA_SALAD_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 103,
    itemName: "سلطة سيزر 🥗",
    realToken: "MENU_51f7bf83",
    tokens: {
      CAESAR_SALAD_QR_NORMAL: { tier: "normal", reveals: 1 },
      CAESAR_SALAD_QR_RARE: { tier: "rare", reveals: 3 },
      CAESAR_SALAD_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 104,
    itemName: "سلطة شاورما 🥗",
    realToken: "MENU_8fa440f9",
    tokens: {
      SHAWARMA_SALAD_QR_NORMAL: { tier: "normal", reveals: 1 },
      SHAWARMA_SALAD_QR_RARE: { tier: "rare", reveals: 3 },
      SHAWARMA_SALAD_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 105,
    itemName: "فتوش 🥗",
    realToken: "MENU_bb9565d3",
    tokens: {
      FATTOUSH_QR_NORMAL: { tier: "normal", reveals: 1 },
      FATTOUSH_QR_RARE: { tier: "rare", reveals: 3 },
      FATTOUSH_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 106,
    itemName: "سلطة كينوا 🥗",
    realToken: "MENU_269d8f1b",
    tokens: {
      QUINOA_SALAD_QR_NORMAL: { tier: "normal", reveals: 1 },
      QUINOA_SALAD_QR_RARE: { tier: "rare", reveals: 3 },
      QUINOA_SALAD_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 107,
    itemName: "بطاطا كيوبس 🍟",
    realToken: "MENU_a3449a1b",
    tokens: {
      POTATO_CUBES_QR_NORMAL: { tier: "normal", reveals: 1 },
      POTATO_CUBES_QR_RARE: { tier: "rare", reveals: 3 },
      POTATO_CUBES_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 108,
    itemName: "فتة شاورما مع رز 🍚",
    realToken: "MENU_1fe2e840",
    tokens: {
      FATTEH_SHAWARMA_RICE_QR_NORMAL: { tier: "normal", reveals: 1 },
      FATTEH_SHAWARMA_RICE_QR_RARE: { tier: "rare", reveals: 3 },
      FATTEH_SHAWARMA_RICE_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 109,
    itemName: "فتة شاورما 🥙",
    realToken: "MENU_46ae3411",
    tokens: {
      FATTEH_SHAWARMA_QR_NORMAL: { tier: "normal", reveals: 1 },
      FATTEH_SHAWARMA_QR_RARE: { tier: "rare", reveals: 3 },
      FATTEH_SHAWARMA_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 110,
    itemName: "فتة فلافل 🧆",
    realToken: "MENU_dfdfa1fe",
    tokens: {
      FATTEH_FALAFEL_QR_NORMAL: { tier: "normal", reveals: 1 },
      FATTEH_FALAFEL_QR_RARE: { tier: "rare", reveals: 3 },
      FATTEH_FALAFEL_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 111,
    itemName: "ماك اند شيز 🧀",
    realToken: "MENU_c9d16a30",
    tokens: {
      MAC_CHEESE_QR_NORMAL: { tier: "normal", reveals: 1 },
      MAC_CHEESE_QR_RARE: { tier: "rare", reveals: 3 },
      MAC_CHEESE_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
  {
    itemId: 112,
    itemName: "ماكسيكان 🌶️",
    realToken: "MENU_13788f87",
    tokens: {
      MEXICAN2_QR_NORMAL: { tier: "normal", reveals: 1 },
      MEXICAN2_QR_RARE: { tier: "rare", reveals: 3 },
      MEXICAN2_QR_SUPER: { tier: "super", reveals: 5 },
    },
  },
];

const RARITY_TOKEN_LOOKUP = RARITY_ITEMS.reduce((map, item) => {
  for (const [token, cfg] of Object.entries(item.tokens)) {
    map[token] = { item, ...cfg };
  }
  return map;
}, {});

const WHEEL_TOKEN = "LUCKY_WHEEL_QR";

// The one printed Gifts QR — the backend picks a random item + rarity tier.
const GIFT_TOKEN = "BEEM_GIFT_QR";

// The backend's rejection messages are English — Arabic shows our own copy
// for each known reason (and the generic error for anything else).
const REASON_KEYS = {
  already_completed: "loyErrAlreadyCompleted",
  no_credit: "loyErrNoCredit",
  invalid_qr: "loyErrNothing",
  all_completed: "loyErrAllCompleted",
};

export default function LoyaltyScanScreen() {
  const { t, lang, pick } = useAppLang();
  const [result, setResult] = useState(null);
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeRarity, setActiveRarity] = useState(null);
  const [pendingRarity, setPendingRarity] = useState(null);

  // The server rolls the tier on every scan (gift QR and meal/sandwich QRs alike)
  // and sends it back — rare and super rare get the celebration, a basic piece
  // gets the normal result card.
  function showScanResult(res) {
    if (res?.accepted && res.tier && res.tier !== "normal") {
      setActiveRarity({
        tier: res.tier,
        item: { itemName: pick(res.item) || res.item?.name },
        apiResult: res,
      });
    } else {
      setResult(res);
    }
  }

  async function onDecode(token) {
    if (token === WHEEL_TOKEN) {
      router.push("/loyalty/wheel");
      return;
    }

    if (token === GIFT_TOKEN) {
      setBusy(true);

      try {
        const res = await apiRequest("/api/loyalty/gift-scan", {
          method: "POST",
        });

        showScanResult(res);
      } catch {
        setResult({
          accepted: false,
          message: t("loyErrGeneric"),
        });
      } finally {
        setBusy(false);
      }

      return;
    }

    const match = RARITY_TOKEN_LOOKUP[token];

    if (match) {
      setBusy(true);

      try {
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

        showScanResult(res);
      } catch {
        setResult({
          accepted: false,
          message: t("loyErrGeneric"),
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
        showScanResult(res);
      }
    } catch {
      setResult({
        accepted: false,
        message: t("loyErrGeneric"),
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
          body: {
            selectedItemId,
            token: match.token,
          },
        });

        showScanResult(res);
      } catch {
        setResult({
          accepted: false,
          message: t("loyErrGeneric"),
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

      showScanResult(res);
    } catch {
      setResult({
        accepted: false,
        message: t("loyErrGeneric"),
      });
    } finally {
      setBusy(false);
    }
  }

  function resultMessage(r) {
    if (lang !== "ar") return r.message;
    const key = REASON_KEYS[r.reason];
    return key ? t(key) : r.message || t("loyErrGeneric");
  }

  function reset() {
    setResult(null);
    setOptions(null);
    setPendingRarity(null);
  }

  function goToRarityItem() {
    router.push("/loyalty");
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
      <GiftsBackdrop />
      <BackButton />

      {!result && !options && !busy && (
        <View style={styles.scannerArea}>
          <QrScanner onDecode={onDecode} />
        </View>
      )}

      {busy && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDot} />
          <Text style={styles.muted}>{t("loyChecking")}</Text>
        </View>
      )}

      {options && (
        <View style={styles.centerContent}>
          <View style={styles.selectionCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🍽️</Text>
            </View>

            <Text style={styles.selectionTitle}>{t("loyWhichItem")}</Text>

            <Text style={styles.selectionSubtitle}>{t("loyChooseItem")}</Text>

            <View style={styles.optionsGrid}>
              {options.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={styles.optionCard}
                  onPress={() => chooseOption(o.id)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: imageUrl(o.grayImage) }}
                    cachePolicy="memory-disk"
                    transition={120}
                    style={styles.optionImage}
                  />

                  <Text style={styles.optionName}>{pick(o)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={reset} style={styles.backChoice}>
              <Text style={styles.link}>{t("loyBack")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {result && (
        <View style={styles.resultWrapper}>
          <View style={styles.resultCard}>
            <Text style={styles.cardLabel}>{t("loyRewardsLabel")}</Text>

            {/* الصورة أكبر ونازلة لتحت */}
            {result.item && (
              <View style={styles.tileContainer}>
                <View style={styles.tileFrame}>
                  <TileImage
                    itemId={result.item.id}
                    grayImage={result.item.grayImage}
                    revealedCount={result.revealedCount ?? 0}
                    size={280}
                  />
                </View>
              </View>
            )}

            {result.accepted ? (
              <>
                <Text style={styles.success}>{t("loyPieceRevealed")}</Text>

                {result.completed && (
                  <View style={styles.voucherBox}>
                    <Text style={styles.voucherTitle}>{t("loyCongratsWon")}</Text>

                    <Text style={styles.voucherReward}>
                      {result.item.rewardValue}
                    </Text>

                    <Text style={styles.codeLabel}>{t("loyRedeemCode")}</Text>

                    <Text style={styles.voucherCode}>
                      {result.voucher.code}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.error}>{resultMessage(result)}</Text>
            )}

            <TouchableOpacity
              style={styles.btn}
              onPress={reset}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{t("loyScanAnother")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.link}>{t("loyBack")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F4",
    paddingHorizontal: 16,
    paddingTop: 60,
  },

  scannerArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FC4A14",
  },

  muted: {
    color: "#17201F",
    fontSize: 14,
    fontWeight: "700",
  },

  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---------------- OPTIONS ---------------- */

  selectionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0DED5",
    elevation: 5,
    shadowColor: "#17201F",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.08,
    shadowRadius: 15,
  },

  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFF0EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  iconText: {
    fontSize: 25,
  },

  selectionTitle: {
    color: "#17201F",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  selectionSubtitle: {
    color: "#7C8582",
    fontSize: 12,
    marginTop: 5,
    marginBottom: 18,
    textAlign: "center",
  },

  optionsGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },

  optionCard: {
    width: 120,
    backgroundColor: "#FFF9F4",
    borderRadius: 16,
    padding: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1DED5",
  },

  optionImage: {
    width: 106,
    height: 106,
    borderRadius: 12,
    backgroundColor: "#EEEEEE",
  },

  optionName: {
    color: "#17201F",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 7,
    marginBottom: 4,
  },

  backChoice: {
    marginTop: 15,
  },

  /* ---------------- RESULT ---------------- */

  resultWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",

    // هاي اللي بتنزل الكرت كله لتحت
    paddingTop: 75,
  },

  resultCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,

    alignItems: "center",

    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 16,

    borderWidth: 1,
    borderColor: "#F0DED5",

    elevation: 6,
    shadowColor: "#17201F",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.09,
    shadowRadius: 18,
  },

  cardLabel: {
    color: "#005751",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },

  /* ---------------- BIG SQUARE IMAGE ---------------- */

  tileContainer: {
    width: 286,
    height: 286,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 8,
    marginBottom: 10,
  },

  tileFrame: {
    width: 284,
    height: 284,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFF9F4",

    borderWidth: 2,
    borderColor: "#005751",

    borderRadius: 18,

    padding: 1,
  },

  /* ---------------- SUCCESS ---------------- */

  success: {
    color: "#005751",
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center",
    marginTop: 3,
    marginBottom: 9,
  },

  /* ---------------- VOUCHER ---------------- */

  voucherBox: {
    width: "100%",
    backgroundColor: "#EAF7F4",
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BDE7DF",
    marginBottom: 10,
  },

  voucherTitle: {
    color: "#FC4A14",
    fontSize: 11,
    fontWeight: "900",
  },

  voucherReward: {
    color: "#17201F",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center",
  },

  codeLabel: {
    color: "#7C8582",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 5,
  },

  voucherCode: {
    color: "#005751",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 1,
  },

  /* ---------------- ERROR ---------------- */

  error: {
    color: "#C0392B",
    fontWeight: "800",
    textAlign: "center",
    backgroundColor: "#FFF0ED",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  /* ---------------- BUTTON ---------------- */

  btn: {
    width: "100%",
    backgroundColor: "#FC4A14",
    borderRadius: 17,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,

    elevation: 3,
    shadowColor: "#FC4A14",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,
  },

  btnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  backButton: {
    marginTop: 5,
    paddingVertical: 6,
    paddingHorizontal: 15,
  },

  link: {
    color: "#7C8582",
    fontSize: 13,
    fontWeight: "700",
  },
});
