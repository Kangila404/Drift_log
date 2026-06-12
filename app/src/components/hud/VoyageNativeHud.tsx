import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing, PanResponder } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export type VoyageInfo = {
  voyageState: "ANCHORED" | "SAILING" | "PAUSED";
  progress: number;
  fromName: string;
  toName: string;
  remainingSeconds: number;
  initReady: boolean;
};

export type SendControl = (action: "pause-resume") => void;

// 돛단배 — 텍스트 색으로 채운 실루엣
function BoatGlyph({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M11.4 3 h1.2 v9 h-1.2 Z" fill={color} />
      <Path d="M12.6 4.5 L18 11 H12.6 Z" fill={color} />
      <Path d="M4 13 h16 l-2.4 4.6 a2 2 0 0 1 -1.78 1.05 H8.18 a2 2 0 0 1 -1.78 -1.05 Z" fill={color} />
    </Svg>
  );
}

export default function VoyageNativeHud({
  info,
  onControl,
  muted,
  onToggleMute,
  hidden,
}: {
  info: VoyageInfo | null;
  onControl: SendControl;
  muted: boolean;
  onToggleMute: () => void;
  hidden?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);   // 옆으로 끈 상태
  const hintAnim = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(0)).current; // 가로 슬라이드

  // 첫 진입 까딱 힌트
  const hintedRef = useRef(false);
  useEffect(() => {
    if (hintedRef.current) return;
    hintedRef.current = true;
    const t = setTimeout(() => {
      Animated.sequence([
        Animated.timing(hintAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(hintAnim, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]).start();
    }, 900);
    return () => clearTimeout(t);
  }, []);

  // 가로 스와이프로 끄기 (오른쪽으로 밀면 dismiss)
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx > 0) slideX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 70) {
          // 끄기
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          Animated.timing(slideX, { toValue: 420, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: true })
            .start(() => setDismissed(true));
        } else {
          // 복귀
          Animated.spring(slideX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;

  const restore = () => {
    Haptics.selectionAsync().catch(() => {});
    setDismissed(false);
    slideX.setValue(60);
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
  };

  if (!info || hidden) return null;
  const sailing = info.voyageState === "SAILING" || info.voyageState === "PAUSED";
  if (!sailing) return null;

  const paused = info.voyageState === "PAUSED";
  const pct = Math.max(0, Math.min(1, info.progress));

  const pauseResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onControl("pause-resume");
  };
  const toggleExpand = () => {
    Haptics.selectionAsync().catch(() => {});
    setExpanded((v) => !v);
  };

  // 끈 상태 — 우측 가장자리에 당김 손잡이 (타이머는 유지)
  if (dismissed) {
    return (
      <>
        <View style={[s.tabWrap, { top: insets.top + 14 }]} pointerEvents="box-none">
          <Pressable onPress={restore} style={s.pullTab}>
            <View style={s.pullGrip} />
            <BoatGlyph color="#6aa8c8" />
          </Pressable>
        </View>
        <View style={[s.timerWrap, { bottom: insets.bottom + 28 }]} pointerEvents="none">
          <CapsuleTimer remainingSeconds={info.remainingSeconds} paused={paused} />
        </View>
      </>
    );
  }

  return (
    <>
      {/* 상단: 티켓 (탭=접기, 옆으로 스와이프=끄기) */}
      <View style={[s.topWrap, { top: insets.top + 10 }]} pointerEvents="box-none">
        <Animated.View
          style={{
            transform: [
              { translateY: hintAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) },
              { translateX: slideX },
            ],
          }}
          {...pan.panHandlers}
        >
          <Pressable onPress={toggleExpand} style={s.ticket}>
            {/* 양옆 펀치홀 */}
            <View style={[s.notch, s.notchLeft]} />
            <View style={[s.notch, s.notchRight]} />

            {/* 상단 라벨 + 끄기 화살표 */}
            <View style={s.ticketHead}>
              <View style={s.statusGroup}>
                <View style={[s.statusLed, { backgroundColor: paused ? "#3a6a86" : "#5ab0d8" }]} />
                <Text style={s.ticketNo}>{paused ? "PAUSED" : "BOARDING"}</Text>
              </View>
              <Text style={s.tapHint}>{expanded ? "탭하여 접기 · 밀어서 숨김 ›" : "탭하여 펼치기 ›"}</Text>
            </View>

            {/* FROM → 배 → TO */}
            <View style={s.routeRow}>
              <View style={s.endCol}>
                <Text style={s.endLabel}>FROM</Text>
                <Text style={s.fromText}>{info.fromName}</Text>
              </View>
              <View style={s.routeMid}>
                <View style={s.routeDot} />
                <View style={s.routeLine} />
                {paused ? <Text style={s.pauseGlyph}>॥</Text> : <BoatGlyph color="#6aa8c8" />}
                <View style={s.routeLine} />
                <View style={[s.routeDot, s.routeDotEnd]} />
              </View>
              <View style={[s.endCol, { alignItems: "flex-end" }]}>
                <Text style={s.endLabel}>TO</Text>
                <Text style={s.toText}>{info.toName}</Text>
              </View>
            </View>

            {/* 펼침 상세 */}
            {expanded ? (
              <>
                <View style={s.dashed} />
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${pct * 100}%`, backgroundColor: paused ? "#3a6a86" : "#5ab0d8" }]}>
                    {!paused && <View style={s.barGlow} />}
                  </View>
                </View>
                <View style={s.subRow}>
                  <Text style={[s.subText, { color: paused ? "#7eb8d4" : "#6aa8c8" }]}>
                    {paused ? "항해 정지 중" : `${info.toName}로 항해 중`}
                  </Text>
                  <Text style={s.subPct}>{Math.round(pct * 100)}%</Text>
                </View>
              </>
            ) : (
              <View style={s.miniBar}>
                <View style={[s.miniFill, { width: `${pct * 100}%`, backgroundColor: paused ? "#3a6a86" : "#5ab0d8" }]} />
              </View>
            )}

            {/* 잡이 핸들 */}
            <View style={s.grabberWrap}>
              <View style={s.grabber} />
            </View>
          </Pressable>
        </Animated.View>

        {/* 펼침일 때만 컨트롤 */}
        {expanded && (
          <View style={s.ctrlRow}>
            <Pressable onPress={pauseResume} disabled={!info.initReady} style={[s.ctrlBtn, paused && s.ctrlBtnActive]}>
              <Text style={[s.ctrlIcon, paused && s.ctrlIconActive]}>{paused ? "▶" : "॥"}</Text>
            </Pressable>
            <Pressable onPress={onToggleMute} style={s.ctrlBtn}>
              <Text style={s.ctrlIcon}>{muted ? "♪̸" : "♪"}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 하단 우측: 캡슐 타이머 (☰ 탭과 같은 라인) */}
      <View style={[s.timerWrap, { bottom: insets.bottom + 28 }]} pointerEvents="none">
        <CapsuleTimer remainingSeconds={info.remainingSeconds} paused={paused} />
      </View>
    </>
  );
}

function CapsuleTimer({ remainingSeconds, paused }: { remainingSeconds: number; paused: boolean }) {
  const [sec, setSec] = useState(remainingSeconds);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => { setSec(remainingSeconds); }, [remainingSeconds]);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setSec((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    if (paused) { pulse.setValue(0.25); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [paused]);

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s2 = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const timeText = sec <= 0 ? "도착" : h > 0 ? `${h}:${pad(m)}:${pad(s2)}` : `${pad(m)}:${pad(s2)}`;

  return (
    <View style={s.capsule}>
      <Animated.View style={[s.capsuleDot, { opacity: pulse, backgroundColor: paused ? "#3a6a86" : "#7ee6ff" }]} />
      <Text style={s.capsuleTime}>{timeText}</Text>
      <Text style={s.capsuleLabel}>{paused ? "정지" : sec <= 0 ? "" : "남음"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  topWrap: { position: "absolute", left: 16, right: 16, gap: 10 },

  ticket: {
    backgroundColor: "rgba(8,20,32,0.9)",
    borderWidth: 1, borderColor: "rgba(40,90,120,0.45)",
    borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 12,
    gap: 9,
    overflow: "hidden",
  },
  notch: { position: "absolute", top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: "#0a1422", borderWidth: 1, borderColor: "rgba(40,90,120,0.45)" },
  notchLeft: { left: -10 },
  notchRight: { right: -10 },

  ticketHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusLed: { width: 5, height: 5, borderRadius: 3 },
  ticketNo: { color: "#5ab0d8", fontSize: 9, letterSpacing: 3, fontFamily: "monospace" },
  tapHint: { color: "#3a6a86", fontSize: 9, letterSpacing: 1.5, fontFamily: "monospace" },
  grabberWrap: { alignItems: "center", marginTop: 2, marginBottom: -6 },
  grabber: { width: 32, height: 3.5, borderRadius: 2, backgroundColor: "rgba(90,138,164,0.4)" },

  routeRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  endCol: { gap: 3 },
  endLabel: { color: "#3a6a86", fontSize: 8, letterSpacing: 2, fontFamily: "monospace" },
  fromText: { color: "#9ec8e0", fontSize: 18, fontWeight: "600", letterSpacing: 1 },
  toText: { color: "#e0f0fb", fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  routeMid: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginHorizontal: 12, paddingBottom: 4 },
  routeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#3a6a86" },
  routeDotEnd: { backgroundColor: "#5ab0d8" },
  routeLine: { flex: 1, height: 1, backgroundColor: "rgba(40,90,120,0.5)" },
  pauseGlyph: { color: "#6aa8c8", fontSize: 15 },

  dashed: { height: 1, borderBottomWidth: 1, borderColor: "rgba(40,90,120,0.4)", borderStyle: "dashed", marginVertical: 0 },

  barTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(13,34,51,0.9)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3, justifyContent: "center" },
  barGlow: { position: "absolute", right: 0, width: 8, height: "100%", backgroundColor: "#9ee6ff", borderRadius: 3, opacity: 0.6 },

  subRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subText: { fontSize: 11.5, letterSpacing: 0.5 },
  subPct: { color: "#5a8aa4", fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums"] },

  miniBar: { height: 3, borderRadius: 2, backgroundColor: "rgba(13,34,51,0.9)", overflow: "hidden" },
  miniFill: { height: "100%", borderRadius: 2 },

  ctrlRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  ctrlBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(7,18,30,0.8)",
    borderWidth: 1, borderColor: "rgba(40,90,120,0.45)",
  },
  ctrlBtnActive: { backgroundColor: "rgba(94,176,216,0.15)", borderColor: "rgba(94,176,216,0.6)" },
  ctrlIcon: { color: "#7eb8d4", fontSize: 16 },
  ctrlIconActive: { color: "#cce8f5" },

  // 끈 상태 — 우측 가장자리 손잡이
  tabWrap: { position: "absolute", right: 0 },
  pullTab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(8,20,32,0.9)",
    borderWidth: 1, borderColor: "rgba(40,90,120,0.45)",
    borderRightWidth: 0,
    borderTopLeftRadius: 18, borderBottomLeftRadius: 18,
    paddingLeft: 12, paddingRight: 14, paddingVertical: 10,
  },
  pullGrip: { width: 3, height: 18, borderRadius: 2, backgroundColor: "rgba(90,138,164,0.5)" },

  timerWrap: { position: "absolute", right: 20, alignItems: "flex-end" },
  capsule: {
    flexDirection: "row", alignItems: "center", gap: 9,
    backgroundColor: "rgba(7,18,30,0.82)",
    borderWidth: 1, borderColor: "rgba(40,90,120,0.45)",
    borderRadius: 22,
    paddingLeft: 14, paddingRight: 18, paddingVertical: 10,
  },
  capsuleDot: { width: 7, height: 7, borderRadius: 4 },
  capsuleTime: { color: "#cce8f5", fontSize: 18, fontWeight: "600", fontVariant: ["tabular-nums"], letterSpacing: 1 },
  capsuleLabel: { color: "#4a7a94", fontSize: 10, letterSpacing: 1, marginLeft: 1 },
});