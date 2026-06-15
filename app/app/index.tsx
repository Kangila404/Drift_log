import { useEffect, useRef } from "react";
import { Text, Animated, Easing, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../src/api/client";

export default function Index() {
  const done = useRef(false);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      const minShow = new Promise((r) => setTimeout(r, 900));
      const decide = (async () => {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (!refreshToken) return "/login" as const;
        try {
          const res = await apiClient.post("/auth/reissue", { refreshToken });
          if (res.data?.accessToken) await AsyncStorage.setItem("accessToken", res.data.accessToken);
          if (res.data?.refreshToken) await AsyncStorage.setItem("refreshToken", res.data.refreshToken);
          return "/mode-select" as const;
        } catch {
          await AsyncStorage.removeItem("accessToken");
          await AsyncStorage.removeItem("refreshToken");
          return "/login" as const;
        }
      })();
      const [, target] = await Promise.all([minShow, decide]);
      router.replace(target);
    })();
  }, []);

  const logoY = rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <LinearGradient
      colors={["#0c1622", "#121a28", "#1e1a2a", "#281a28", "#331d28"]}
      locations={[0, 0.3, 0.55, 0.8, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={s.root}
    >
      {/* 상단 청록 달빛 글로우 — 길게 페이드 */}
      <LinearGradient
        colors={["rgba(74,154,187,0.13)", "rgba(74,154,187,0.06)", "rgba(74,154,187,0.02)", "transparent"]}
        locations={[0, 0.4, 0.7, 1]}
        style={s.topGlow}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      {/* 하단 황혼 빛번짐 */}
      <LinearGradient
        colors={["transparent", "rgba(180,100,120,0.16)", "rgba(200,120,100,0.20)"]}
        locations={[0, 0.6, 1]}
        style={s.duskGlow}
        start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }}
        pointerEvents="none"
      />

      <Animated.View style={[s.center, { opacity: fade, transform: [{ translateY: logoY }] }]}>
        <Text style={s.brand}>DRIFTLOG</Text>
        <Animated.View style={s.line} />
        <Text style={s.tagline}>물에 잠긴 도시를 항해하다</Text>
      </Animated.View>

      <Animated.View style={[s.loadingDot, { opacity: pulse }]} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 520 },
  duskGlow: { position: "absolute", bottom: 0, left: 0, right: 0, height: 480 },

  center: { alignItems: "center", gap: 14 },
  brand: { color: "rgba(225,210,215,0.92)", fontSize: 30, letterSpacing: 14, fontWeight: "600", marginLeft: 14 },
  line: { width: 48, height: 1, backgroundColor: "rgba(200,170,180,0.5)" },
  tagline: { color: "rgba(200,170,180,0.5)", fontSize: 11, letterSpacing: 4, fontFamily: "monospace" },

  loadingDot: { position: "absolute", bottom: 70, width: 6, height: 6, borderRadius: 3, backgroundColor: "#c88a7a" },
});