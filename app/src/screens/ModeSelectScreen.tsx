import { useEffect, useRef, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, Animated, Easing, Modal,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { assetUrl } from "../api/config";
import { getVersion } from "../api/version";

const MODES = [
  { route: "voyage", title: "항해", en: "VOYAGE", desc: "물에 잠긴 도시를 항해하며 가족의 흔적을 찾습니다.", img: "/mode/voyage.png", locked: false },
  { route: "study", title: "공부", en: "STUDY", desc: "항해 시간 동안 백색 소음을 들으며 집중하세요.", img: "/mode/study.png", locked: false },
];

// ── 도미노 충격파 타이밍 (ms). 위에서 아래로 와르르 ──
const T_TITLE_LAND = 540;   // DRIFTLOG가 낙하해 막대를 쾅 치는 순간
const T_LINE_HIT   = 660;   // 막대(____)가 밀림
const T_VER_HIT    = 770;   // 버전 배지가 떨어짐
const T_SUB_HIT    = 880;   // "모드를 선택하세요"가 밀림
const T_CARD0_HIT  = 1000;  // 항해 박스가 밀림
const T_CARD1_HIT  = 1110;  // 공부 박스가 밀림

function LockGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={9} rx={1.5} stroke="#8ab4cc" strokeWidth={1.6} />
      <Path d="M8 11 V8 a4 4 0 0 1 8 0 v3" stroke="#8ab4cc" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function ModeCard({
  mode, hitDelay, onHit, onPress,
}: {
  mode: typeof MODES[number];
  hitDelay: number;
  onHit: () => void;
  onPress: () => void;
}) {
  const appear = useRef(new Animated.Value(0)).current;  // 부드러운 등장
  const push = useRef(new Animated.Value(0)).current;    // 충격 밀림(출렁)
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // 충격파가 닿는 순간 — 아래로 퉁 밀렸다 스프링 복귀 + 진동
    const t = setTimeout(() => {
      onHit();
      Animated.sequence([
        Animated.timing(push, { toValue: 1, duration: 55, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(push, { toValue: 0, useNativeDriver: true, speed: 10, bounciness: 18 }),
      ]).start();
    }, hitDelay);
    return () => clearTimeout(t);
  }, []);

  const onIn = () => Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onOut = () => Animated.spring(press, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 4 }).start();

  const pushY = push.interpolate({ inputRange: [0, 1], outputRange: [0, 13] });   // 충격 시 아래로 밀림
  const scaleY = push.interpolate({ inputRange: [0, 1], outputRange: [1, 0.955] }); // 살짝 눌림
  const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });

  return (
    <Animated.View style={{ flex: 1, opacity: appear, transform: [{ translateY: pushY }, { scaleY }, { scale: pressScale }] }}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} style={s.card}>
        <Image source={{ uri: assetUrl(mode.img)! }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />

        <LinearGradient
          colors={["rgba(3,9,16,0.05)", "rgba(3,9,16,0.45)", "rgba(3,9,16,0.95)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {mode.locked && <View style={s.lockVeil} />}

        <View style={[s.cardBorder, mode.locked && s.cardBorderLocked]} pointerEvents="none" />

        {mode.locked && (
          <View style={s.lockTag}>
            <LockGlyph />
            <Text style={s.lockTagText}>준비 중</Text>
          </View>
        )}

        <View style={s.cardBody}>
          <Text style={[s.cardEn, mode.locked && s.dim]}>{mode.en}</Text>
          <Text style={[s.cardTitle, mode.locked && s.dim]}>{mode.title}</Text>
          <Text style={[s.cardDesc, mode.locked && s.dimDesc]}>{mode.desc}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ModeSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [version, setVersion] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // 우상단 로그아웃 버튼 — 도미노 끝난 뒤 은은히 페이드인
  const utilFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(utilFade, { toValue: 1, duration: 500, delay: 1250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  // ── DRIFTLOG 낙하 + 충격파 도미노 ──
  const titleDrop = useRef(new Animated.Value(0)).current;    // 0=위, 1=착지
  const titleImpact = useRef(new Animated.Value(0)).current;  // 막대를 친 반동
  const linePush = useRef(new Animated.Value(0)).current;     // 막대 밀림
  const verDrop = useRef(new Animated.Value(0)).current;      // 버전 배지 낙하
  const subPush = useRef(new Animated.Value(0)).current;      // 서브타이틀 밀림

  useEffect(() => {
    getVersion().then((d) => setVersion(d.version)).catch(() => {});
  }, []);

  useEffect(() => {
    // DRIFTLOG가 위에서 쾅 낙하 (중력 가속, 더 높이서)
    Animated.timing(titleDrop, {
      toValue: 1, duration: 380, delay: T_TITLE_LAND - 380,
      easing: Easing.in(Easing.quad), useNativeDriver: true,
    }).start();

    // 1) 착지 = 막대를 쾅 → Heavy 진동 + 반동
    const t1 = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      Animated.sequence([
        Animated.timing(titleImpact, { toValue: 1, duration: 55, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(titleImpact, { toValue: 0, useNativeDriver: true, speed: 10, bounciness: 20 }),
      ]).start();
    }, T_TITLE_LAND);

    // 2) 막대(____) 밀림 + 진동
    const t2 = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Animated.sequence([
        Animated.timing(linePush, { toValue: 1, duration: 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(linePush, { toValue: 0, useNativeDriver: true, speed: 11, bounciness: 16 }),
      ]).start();
    }, T_LINE_HIT);

    // 3) 버전 배지가 위에서 톡 떨어짐 + 진동
    const t3 = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.spring(verDrop, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
    }, T_VER_HIT);

    // 4) "모드를 선택하세요" 밀림 + 진동
    const t4 = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.sequence([
        Animated.timing(subPush, { toValue: 1, duration: 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(subPush, { toValue: 0, useNativeDriver: true, speed: 11, bounciness: 16 }),
      ]).start();
    }, T_SUB_HIT);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // 박스가 충격받을 때 진동 (항해=Medium, 공부=Light)
  const onCardHit = (first: boolean) => {
    Haptics.impactAsync(first ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePress = (mode: typeof MODES[number]) => {
    Haptics.impactAsync(mode.locked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    if (mode.locked) return;
    router.push(mode.route === "study" ? "/study" : "/voyage" as any);
  };

  // 로그아웃 — 토큰 삭제 후 로그인 화면으로
  const doLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLogoutOpen(false);
    try {
      await AsyncStorage.removeItem("accessToken");
      await AsyncStorage.removeItem("refreshToken");
    } catch {}
    router.replace("/login");
  };

  // DRIFTLOG: 더 높이서 낙하 + 착지 반동 + 살짝 기울었다 펴짐 + 좌우 부르르
  const titleDropY = titleDrop.interpolate({ inputRange: [0, 1], outputRange: [-44, 0] });
  const titleImpactY = titleImpact.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  const titleY = Animated.add(titleDropY, titleImpactY);
  const titleRotate = titleDrop.interpolate({ inputRange: [0, 0.7, 1], outputRange: ["-4deg", "-2deg", "0deg"] });
  const titleShakeX = titleImpact.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["0deg", "1.5deg", "0deg"] });
  const titleScaleY = titleImpact.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
  const titleOpacity = titleDrop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });

  // 막대: 아래로 밀림 + 충격 순간 가로로 늘어남
  const lineY = linePush.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
  const lineScaleX = linePush.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });

  // 버전 배지: 위에서 톡 떨어짐 + 살짝 튕김
  const verY = verDrop.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });
  const verOpacity = verDrop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] });

  // 서브타이틀: 아래로 밀림
  const subY = subPush.interpolate({ inputRange: [0, 1], outputRange: [0, 7] });

  return (
    <View style={[s.root, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 20 }]}>
      <LinearGradient
        colors={["rgba(74,154,187,0.10)", "transparent"]}
        style={s.topGlow}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
      />

      {/* 우상단 로그아웃 */}
      <Animated.View style={[s.utilWrap, { top: insets.top + 8, opacity: utilFade }]}>
        <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); setLogoutOpen(true); }} style={s.logoutBtn} hitSlop={8}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
            <Path d="M15 4 H6 a2 2 0 0 0-2 2 v12 a2 2 0 0 0 2 2 h9" stroke="#3a6880" strokeWidth={1.6} strokeLinecap="round" />
            <Path d="M18 8 l4 4-4 4 M22 12 H10" stroke="#3a6880" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={s.logoutText}>로그아웃</Text>
        </Pressable>
      </Animated.View>

      <View style={s.titleWrap}>
        <Animated.Text
          style={[s.brand, {
            opacity: titleOpacity,
            transform: [{ translateY: titleY }, { rotateZ: titleRotate }, { rotate: titleShakeX }, { scaleY: titleScaleY }],
          }]}
        >
          DRIFTLOG
        </Animated.Text>
        <Animated.View style={[s.brandLine, { transform: [{ translateY: lineY }, { scaleX: lineScaleX }] }]} />

        {version && (
          <Animated.View style={[s.verBadge, { opacity: verOpacity, transform: [{ translateY: verY }] }]}>
            <Text style={s.verText}>{version}</Text>
          </Animated.View>
        )}

        <Animated.Text style={[s.subtitle, { transform: [{ translateY: subY }] }]}>
          모드를 선택하세요
        </Animated.Text>
      </View>

      <View style={s.cards}>
        {MODES.map((m, i) => (
          <View key={m.route} style={{ flex: 1 }}>
            <ModeCard
              mode={m}
              hitDelay={i === 0 ? T_CARD0_HIT : T_CARD1_HIT}
              onHit={() => onCardHit(i === 0)}
              onPress={() => handlePress(m)}
            />
          </View>
        ))}
      </View>

      {/* 로그아웃 확인 */}
      <Modal visible={logoutOpen} transparent animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setLogoutOpen(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <Text style={s.modalTitle}>로그아웃</Text>
            <Text style={s.modalDesc}>로그아웃하시겠어요?{"\n"}다시 로그인해야 항해를 이어갈 수 있어요.</Text>
            <View style={s.modalRow}>
              <Pressable onPress={() => setLogoutOpen(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>취소</Text>
              </Pressable>
              <Pressable onPress={doLogout} style={s.confirmBtn}>
                <Text style={s.confirmText}>로그아웃</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07111d", paddingHorizontal: 22 },
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 260 },

  titleWrap: { alignItems: "center", gap: 12, marginBottom: 34 },
  brand: { color: "#a8d4e8", fontSize: 23, letterSpacing: 11, fontWeight: "600", marginLeft: 11 },
  brandLine: { width: 40, height: 1, backgroundColor: "rgba(74,154,187,0.5)" },
  verBadge: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11,
    borderWidth: 1, borderColor: "rgba(74,154,187,0.35)", backgroundColor: "rgba(10,34,51,0.5)",
  },
  verText: { color: "#4a7a94", fontSize: 9, letterSpacing: 2, fontFamily: "monospace" },
  subtitle: { color: "#2a5a74", fontSize: 10, letterSpacing: 6, fontFamily: "monospace" },

  cards: { flex: 1, gap: 16, justifyContent: "center" },

  card: { flex: 1, borderRadius: 18, overflow: "hidden", backgroundColor: "#0a1828" },
  cardBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 18, borderWidth: 1, borderColor: "rgba(74,154,187,0.4)" },
  cardBorderLocked: { borderColor: "rgba(40,90,120,0.3)" },
  lockVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,9,16,0.55)" },

  lockTag: {
    position: "absolute", top: 14, right: 14,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(7,17,29,0.85)", borderWidth: 1, borderColor: "rgba(74,154,187,0.3)",
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
  },
  lockTagText: { color: "#8ab4cc", fontSize: 11, letterSpacing: 1, fontFamily: "monospace" },

  cardBody: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingBottom: 26, paddingHorizontal: 24, gap: 6 },
  cardEn: { color: "rgba(126,184,212,0.75)", fontSize: 10, letterSpacing: 6, fontFamily: "monospace" },
  cardTitle: { color: "#cce8f5", fontSize: 28, letterSpacing: 8, fontWeight: "600", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 14, textShadowOffset: { width: 0, height: 2 } },
  cardDesc: { color: "rgba(168,212,232,0.7)", fontSize: 11, lineHeight: 18, textAlign: "center", maxWidth: 250, marginTop: 4 },
  dim: { color: "#5a8aa4" },
  dimDesc: { color: "rgba(90,138,164,0.6)" },

  // 우상단 로그아웃
  utilWrap: { position: "absolute", right: 20, zIndex: 20 },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", backgroundColor: "rgba(7,17,29,0.6)" },
  logoutText: { color: "#3a6880", fontSize: 11, letterSpacing: 1, fontFamily: "monospace" },

  // 로그아웃 확인 모달
  overlay: { flex: 1, backgroundColor: "rgba(2,6,14,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 320, backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 18, padding: 26, gap: 20 },
  modalTitle: { color: "#7eb8d4", fontSize: 12, letterSpacing: 4, fontFamily: "monospace", textAlign: "center" },
  modalDesc: { color: "#4a7a94", fontSize: 12, lineHeight: 20, fontFamily: "monospace", textAlign: "center" },
  modalRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: "#1a3a50", alignItems: "center" },
  cancelText: { color: "#3a6880", fontSize: 12, letterSpacing: 1.5, fontFamily: "monospace" },
  confirmBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: "rgba(120,40,40,0.5)", alignItems: "center" },
  confirmText: { color: "rgba(200,100,100,0.85)", fontSize: 12, letterSpacing: 1.5, fontFamily: "monospace" },
});