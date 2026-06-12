import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Animated, Easing } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useRouter, useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import VoyageHud from "../components/hud/VoyageHud";
import VoyageNativeHud, { type VoyageInfo } from "../components/hud/VoyageNativeHud"
import { nativeBgm } from "../api/nativeBgm";
import { getUserProfile } from "../api/voyage";
import { setVoyageInfo as setGlobalVoyageInfo } from "../stores/voyageHudStore";

const WEB_URL = "https://driftlog.kro.kr/voyage";

export default function VoyageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();   // 화면 떠나면 WebView 언마운트 → 폴링 중단 → 진척 안 오름
  const webRef = useRef<WebView>(null);
  const [injectedJS, setInjectedJS] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [muted, setMuted] = useState(nativeBgm.isMuted());
  const [voyageInfo, setVoyageInfo] = useState<VoyageInfo | null>(null);

  // ── 진입 인사 (WebView 로딩 완료 후 1회) ──
  const [greeting, setGreeting] = useState<{ msg: string; name: string } | null>(null);
  const greetAnim = useRef(new Animated.Value(0)).current;
  const greetedRef = useRef(false);
  const webFade = useRef(new Animated.Value(0)).current;   // WebView 페이드인

  const onWebLoaded = () => {
    // 바다 3D 렌더 여유 후 부드럽게 페이드인
    setTimeout(() => {
      Animated.timing(webFade, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
      showGreeting();
    }, 250);
  };

  const showGreeting = async () => {
    if (greetedRef.current) return;   // 1회만
    greetedRef.current = true;

    const hour = new Date().getHours();
    const msg =
      hour < 6 ? "깊은 밤입니다." :
      hour < 12 ? "좋은 아침입니다." :
      hour < 18 ? "좋은 오후입니다." :
      "좋은 저녁입니다.";
    let name = "";
    try { name = (await getUserProfile()).name; } catch {}

    setGreeting({ msg, name });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    Animated.timing(greetAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(greetAnim, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => setGreeting(null));
    }, 3000);
  };

  useEffect(() => {
    nativeBgm.prime();
    (async () => {
      // index.tsx 진입 가드에서 이미 갱신됨 → 여기선 저장된 토큰 주입만
      const accessToken = await AsyncStorage.getItem("accessToken");
      const refresh = await AsyncStorage.getItem("refreshToken");
      const js = `
        (function() {
          try {
            window.isNativeApp = true;
            ${accessToken ? `localStorage.setItem("accessToken", ${JSON.stringify(accessToken)});` : ""}
            ${refresh ? `localStorage.setItem("refreshToken", ${JSON.stringify(refresh)});` : ""}
          } catch (e) {}
          true;
        })();
      `;
      setInjectedJS(js);
    })();
  }, []);

  // 화면 떠나면 음악 정지 + 항해 상태 초기화 + 인사/페이드 리셋(다시 들어올 때 재생)
  useFocusEffect(
    useCallback(() => {
      return () => {
        nativeBgm.stop();
        setGlobalVoyageInfo(null);
        // WebView가 언마운트되므로 다음 진입 때 인사/페이드 다시 뜨도록 리셋
        greetedRef.current = false;
        greetAnim.setValue(0);
        webFade.setValue(0);
      };
    }, [])
  );

  const handleMessage = async (e: WebViewMessageEvent) => {
    let msg: any = {};
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }

    if (msg.type === "bgm") {
      if (msg.track === "voyage") nativeBgm.playVoyage();
      else if (msg.track === "city") nativeBgm.playCity(msg.url);
      else if (msg.track === "ending") nativeBgm.playEnding();
      else if (msg.track === "stop") nativeBgm.stop();
    } else if (msg.type === "token-refresh") {
      // ── ③ 웹이 WebView 안에서 토큰 갱신 → 앱 AsyncStorage도 동기화 ──
      if (msg.accessToken) await AsyncStorage.setItem("accessToken", msg.accessToken);
      if (msg.refreshToken) await AsyncStorage.setItem("refreshToken", msg.refreshToken);
    } else if (msg.type === "voyage") {
      const vi = {
        voyageState: msg.voyageState,
        progress: msg.progress ?? 0,
        fromName: msg.fromName ?? "—",
        toName: msg.toName ?? "—",
        remainingSeconds: msg.remainingSeconds ?? 0,
        initReady: !!msg.initReady,
      };
      setVoyageInfo(vi);
      setGlobalVoyageInfo(vi);
    } else if (msg.type === "navigate") {
      if (msg.to === "mode-select") { nativeBgm.stop(); router.replace("/mode-select"); }
    } else if (msg.type === "logout") {
      nativeBgm.stop();
      await AsyncStorage.removeItem("accessToken");
      await AsyncStorage.removeItem("refreshToken");
      router.replace("/login");
    } else if (msg.type === "haptic") {
      const style = msg.style === "heavy" ? Haptics.ImpactFeedbackStyle.Heavy
        : msg.style === "medium" ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(style).catch(() => {});
    } else if (msg.type === "overlay") {
      setOverlayVisible(!!msg.visible);
    }
  };

  const sendControl = (action: "pause-resume") => {
    webRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'voyage-control', action: '${action}' }) }));
      true;
    `);
  };

  const toggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMuted(nativeBgm.toggleMute());
  };

  if (injectedJS === null) {
    return (
      <View style={st.loading}>
        <ActivityIndicator color="#4a9abb" />
      </View>
    );
  }

  return (
    <View style={st.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: webFade }]}>
        {isFocused && (
          <WebView
            ref={webRef}
            source={{ uri: WEB_URL }}
            injectedJavaScriptBeforeContentLoaded={injectedJS}
            onMessage={handleMessage}
            onLoadEnd={onWebLoaded}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            scalesPageToFit={false}
            style={st.web}
          />
        )}
      </Animated.View>

      <VoyageNativeHud
        info={voyageInfo}
        onControl={sendControl}
        muted={muted}
        onToggleMute={toggleMute}
        hidden={overlayVisible}
      />

      {!overlayVisible && !(voyageInfo && (voyageInfo.voyageState === "SAILING" || voyageInfo.voyageState === "PAUSED")) && (
        <Pressable onPress={toggleMute} style={[st.muteBtn, { top: insets.top + 10 }]}>
          <Text style={st.muteText}>{muted ? "♪̸" : "♪"}</Text>
        </Pressable>
      )}

      <VoyageHud hideFab={overlayVisible} />

      {/* 진입 인사 — 텍스트만 */}
      {greeting && (
        <Animated.Text
          style={[st.greetMsg, { opacity: greetAnim, transform: [{ translateY: greetAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}
          pointerEvents="none"
        >
          {greeting.msg}
        </Animated.Text>
      )}
      {greeting && (
        <Animated.Text
          style={[st.greetName, { opacity: greetAnim, transform: [{ translateY: greetAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
          pointerEvents="none"
        >
          {greeting.name}님
        </Animated.Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07111d" },
  web: { backgroundColor: "#07111d" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#07111d" },
  muteBtn: {
    position: "absolute", right: 16,
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(10,24,40,0.85)", borderWidth: 1, borderColor: "rgba(26,74,100,0.6)",
  },
  muteText: { color: "#7eb8d4", fontSize: 18 },
  greetMsg: {
    position: "absolute", top: "44%", left: 0, right: 0, textAlign: "center", zIndex: 50,
    color: "#7eb8d4", fontSize: 13, letterSpacing: 5, fontFamily: "monospace",
    textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 14,
  },
  greetName: {
    position: "absolute", top: "50%", left: 0, right: 0, textAlign: "center", zIndex: 50,
    color: "#cce8f5", fontSize: 24, letterSpacing: 4, fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 16,
  },
});