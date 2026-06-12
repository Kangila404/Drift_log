import { useRef, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, Animated, PanResponder, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import LogPanel from "../hud/panels/LogPanel";
import MapPanel from "../hud/panels/MapPanel";
import TracePanel from "../hud/panels/TracePanel";
import ProfilePanel from "../hud//panels/ProfilePanel";
import { useRouter } from "expo-router";

type Tab = "map" | "trace" | "log" | "profile";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "map", icon: "◎", label: "지도" },
  { id: "trace", icon: "✦", label: "흔적" },
  { id: "log", icon: "≡", label: "항해록" },
  { id: "profile", icon: "○", label: "나" },
];

export default function VoyageHud({ hideFab = false }: { hideFab?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const TAB_W = SCREEN_W / 4;
  const SHEET_H = SCREEN_H * 0.85;

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("log");
  // 한 번이라도 연 탭만 마운트 (첫 진입 부하 줄이면서, 연 탭은 계속 살려둠)
  const [mounted, setMounted] = useState<Record<Tab, boolean>>({
    map: false, trace: false, log: true, profile: false,
  });
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  const animateTo = (toValue: number, cb?: () => void) => {
    Animated.timing(translateY, { toValue, duration: 220, useNativeDriver: true }).start(cb);
  };

  const openSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setOpen(true);
    translateY.setValue(SHEET_H);
    requestAnimationFrame(() => animateTo(0));
  };

  const closeSheet = () => {
    animateTo(SHEET_H, () => setOpen(false));
  };

  const selectTab = (id: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveTab(id);
    if (!mounted[id]) setMounted((m) => ({ ...m, [id]: true }));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60 || g.vy > 0.5) animateTo(SHEET_H, () => setOpen(false));
        else animateTo(0);
      },
    })
  ).current;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {!open && !hideFab && (
        <View style={[styles.fabWrap, { bottom: insets.bottom + 24 }]} pointerEvents="box-none">
          <Pressable onPress={openSheet} style={styles.fab}>
            <Text style={styles.fabIcon}>☰</Text>
          </Pressable>
        </View>
      )}

      {open && (
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={closeSheet} />

          <Animated.View style={[styles.sheet, { height: SHEET_H, transform: [{ translateY }] }]}>
            <View {...pan.panHandlers}>
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>

              <View style={styles.tabBar}>
                {TABS.map((t) => {
                  const active = activeTab === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => selectTab(t.id)}
                      style={[styles.tab, { width: TAB_W }, active && styles.tabActive]}
                    >
                      <Text style={[styles.tabIcon, active && styles.tabTextActive]}>{t.icon}</Text>
                      <Text style={[styles.tabLabel, active && styles.tabTextActive]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 모든 탭을 마운트 유지 — 안 보이는 건 display none. 한 번 로딩되면 재진입 즉시 */}
            <View style={styles.content}>
              {mounted.log && <View style={[styles.panel, activeTab !== "log" && styles.hidden]}><LogPanel /></View>}
              {mounted.map && <View style={[styles.panel, activeTab !== "map" && styles.hidden]}><MapPanel /></View>}
              {mounted.trace && <View style={[styles.panel, activeTab !== "trace" && styles.hidden]}><TracePanel /></View>}
              {mounted.profile && <View style={[styles.panel, activeTab !== "profile" && styles.hidden]}><ProfilePanel /></View>}
            </View>
            <Pressable
              onPress={() => { closeSheet(); setTimeout(() => router.replace("/mode-select"), 200); }}
              style={[styles.leaveRow, { paddingBottom: insets.bottom + 14 }]}
            >
              <Text style={styles.leaveText}>‹ 모드 선택으로</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  fabWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(26,74,100,0.7)", backgroundColor: "rgba(10,24,40,0.9)",
  },
  fabIcon: { color: "#7eb8d4", fontSize: 22 },

  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,14,0.35)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(5,14,24,0.97)",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: "rgba(26,74,100,0.4)",
    overflow: "hidden", flexDirection: "column",
  },
  handleWrap: { alignItems: "center", paddingTop: 14, paddingBottom: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#2a5a74" },

  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0d2233" },
  tab: {
    alignItems: "center", justifyContent: "center", paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#4a9abb" },
  tabIcon: { fontSize: 18, color: "#1a3a50" },
  tabLabel: { fontSize: 11, marginTop: 4, color: "#1a3a50" },
  tabTextActive: { color: "#7eb8d4" },

  content: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingHorizontal: 20, paddingTop: 12 },
  panel: { flex: 1 },
  hidden: { display: "none" },
  leaveRow: { borderTopWidth: 1, borderTopColor: "#0d2233", paddingTop: 14, alignItems: "center" },
  leaveText: { color: "#3a6880", fontSize: 11, letterSpacing: 2, fontFamily: "monospace" },
});