import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../src/api/client";

export default function Index() {
  const done = useRef(false);

  // 브랜드 페이드인 + 로딩 점멸
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // 로고 떠오름
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // 하단 로딩 도트 은은한 점멸
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
      // 너무 빨리 사라지면 깜빡임처럼 보여서, 최소 노출 시간 확보
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
    <View style={s.root}>
      <LinearGradient
        colors={["rgba(74,154,187,0.12)", "transparent"]}
        style={s.glow}
        start={{ x: 0.5, y: 0.3 }} end={{ x: 0.5, y: 1 }}
      />

      <Animated.View style={[s.center, { opacity: fade, transform: [{ translateY: logoY }] }]}>
        <Text style={s.brand}>DRIFTLOG</Text>
        <View style={s.line} />
        <Text style={s.tagline}>물에 잠긴 도시를 항해하다</Text>
      </Animated.View>

      <Animated.View style={[s.loadingDot, { opacity: pulse }]} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07111d", alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  center: { alignItems: "center", gap: 14 },
  brand: { color: "#a8d4e8", fontSize: 30, letterSpacing: 14, fontWeight: "600", marginLeft: 14 },
  line: { width: 48, height: 1, backgroundColor: "rgba(74,154,187,0.5)" },
  tagline: { color: "#2a5a74", fontSize: 11, letterSpacing: 4, fontFamily: "monospace" },

  loadingDot: { position: "absolute", bottom: 70, width: 6, height: 6, borderRadius: 3, backgroundColor: "#4a9abb" },
});